import express from 'express';
import request from 'supertest';
import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import {
  rateLimiter,
  setRateLimiterStore,
  setRateLimiterConfig,
  createAtomicRateLimitClient,
  IORedisAtomicClient,
  createSharedRateLimitStoreFromEnv,
  RedisStore,
} from '../src/middleware/security';

class MockEvalRedisClient {
  public calls: Array<Record<string, unknown>> = [];
  private store = new Map<string, { val: number; expiresAt?: number }>();

  async eval(a: any, b: any, c?: any, ...rest: any[]) {
      let provider: 'ioredis';
      let key: string;
      let windowMsStr: string;
      let limitStr: string;

      if (typeof b === 'number' && typeof c === 'string') {
        provider = 'ioredis';
        key = c;
        windowMsStr = rest[0];
        limitStr = rest[1];
      } else {
        throw new Error('Unsupported eval signature');
      }

      this.calls.push({
        provider,
        script: a,
        key,
        numKeys: provider === 'ioredis' ? b : undefined,
        args: [String(windowMsStr), String(limitStr)],
        windowMsStr,
        limitStr,
      });

    const windowMs = Number(windowMsStr);
    const now = Date.now();
    const rec = this.store.get(key);
    if (!rec || (rec.expiresAt && now > rec.expiresAt)) {
      this.store.set(key, { val: 1, expiresAt: now + windowMs });
      return [1, windowMs];
    }

    rec.val += 1;
    const ttl = rec.expiresAt ? rec.expiresAt - now : windowMs;
    return [rec.val, ttl];
  }
}

function makeApp(store: { incr: (key: string, windowMs: number, limit: number) => Promise<any> }) {
  setRateLimiterStore(store as any);
  const app = express();
  app.get('/ping', rateLimiter, (_req, res) => res.status(200).send('ok'));
  return app;
}

function makeRateLimiterCall(store: { incr: (key: string, windowMs: number, limit: number) => Promise<any> }, options: { ip?: string; tenantId?: string; headers?: Record<string, string> } = {}) {
  setRateLimiterStore(store as any);
  const req: any = {
    ip: options.ip,
    socket: { remoteAddress: options.ip },
    headers: options.headers || {},
    method: 'GET',
    url: '/ping',
  };
  if (options.tenantId) {
    req.user = { tenantId: options.tenantId };
  }

  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    setHeader(key: string, value: string) {
      this.headers[key] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
    send(body: unknown) {
      this.body = body;
      return this;
    },
  };

  let nextCalled = false;
  const next = () => {
    nextCalled = true;
    return Promise.resolve();
  };

  return rateLimiter(req, res, next).then(() => ({ req, res, nextCalled }));
}

const originalEnv = { ...process.env };

beforeEach(() => {
  setRateLimiterConfig({ windowMs: 2000, maxRequests: 100 });
});

afterEach(() => {
  Object.assign(process.env, originalEnv);
});

describe('security.rateLimiter concurrency and failure', () => {
  it('enforces configured limit under high concurrency (mock redis)', async () => {
    const client = new MockEvalRedisClient();
    const store = new RedisStore(new IORedisAtomicClient(client), client as any);

    setRateLimiterConfig({ windowMs: 2000, maxRequests: 5 });
    const app = makeApp(store);

    const total = 20;
    const results = await Promise.all(Array.from({ length: total }, () => request(app).get('/ping')));

    const success = results.filter(r => r.status === 200).length;
    const blocked = results.filter(r => r.status === 429).length;

    expect(success).toBe(5);
    expect(blocked).toBe(15);
    expect(client.calls.length).toBe(total);

    const firstSuccess = results.find(r => r.status === 200)!;
    expect(Number(firstSuccess.headers['x-ratelimit-limit'])).toBe(5);
    expect(Number(firstSuccess.headers['x-ratelimit-remaining'])).toBeGreaterThanOrEqual(0);
    expect(Number(firstSuccess.headers['x-ratelimit-reset'])).toBeGreaterThan(0);

    const firstBlocked = results.find(r => r.status === 429)!;
    expect(firstBlocked.headers['retry-after']).toBeDefined();
  });

  it('returns 503 when shared store errors (fail-closed)', async () => {
    const bad = { incr: async () => { throw new Error('redis down'); } };
    const app = makeApp(bad);
    const res = await request(app).get('/ping');
    expect(res.status).toBe(503);
  });

  it('invalid shared store count returns 503', async () => {
    const bad = { incr: async () => ({ count: NaN, resetAt: Date.now() + 1000 }) };
    const app = makeApp(bad);
    const res = await request(app).get('/ping');
    expect(res.status).toBe(503);
  });

  it('invalid shared store resetAt returns 503', async () => {
    const bad = { incr: async () => ({ count: 1, resetAt: NaN }) };
    const app = makeApp(bad);
    const res = await request(app).get('/ping');
    expect(res.status).toBe(503);
  });

  it('creates a fresh window after expiry', async () => {
    const client = new MockEvalRedisClient();
    const store = new RedisStore(new IORedisAtomicClient(client), client as any);
    setRateLimiterConfig({ windowMs: 100, maxRequests: 1 });
    const app = makeApp(store);

    const first = await request(app).get('/ping');
    expect(first.status).toBe(200);

    const second = await request(app).get('/ping');
    expect(second.status).toBe(429);

    await new Promise(resolve => setTimeout(resolve, 120));

    const third = await request(app).get('/ping');
    expect(third.status).toBe(200);
  });

  it('shares one limit for the same tenant and ip', async () => {
    const client = new MockEvalRedisClient();
    const store = new RedisStore(new IORedisAtomicClient(client), client as any);
    setRateLimiterConfig({ windowMs: 2000, maxRequests: 1 });

    const first = await makeRateLimiterCall(store, { ip: '1.2.3.4', tenantId: 'tenant-a' });
    const second = await makeRateLimiterCall(store, { ip: '1.2.3.4', tenantId: 'tenant-a' });

    expect(first.res.statusCode).toBe(200);
    expect(second.res.statusCode).toBe(429);
  });

  it('uses separate keys for different authenticated tenants', async () => {
    const client = new MockEvalRedisClient();
    const store = new RedisStore(new IORedisAtomicClient(client), client as any);
    setRateLimiterConfig({ windowMs: 2000, maxRequests: 1 });

    const r1 = await makeRateLimiterCall(store, { ip: '1.2.3.4', tenantId: 'tenant-a' });
    const r2 = await makeRateLimiterCall(store, { ip: '1.2.3.4', tenantId: 'tenant-b' });

    expect(r1.res.statusCode).toBe(200);
    expect(r2.res.statusCode).toBe(200);
  });

  it('does not trust tenant identity supplied in request headers', async () => {
    const client = new MockEvalRedisClient();
    const store = new RedisStore(new IORedisAtomicClient(client), client as any);
    setRateLimiterConfig({ windowMs: 2000, maxRequests: 1 });

    const first = await makeRateLimiterCall(store, { ip: '1.2.3.4', headers: { 'x-tenant-id': 'tenant-a' } });
    const second = await makeRateLimiterCall(store, { ip: '1.2.3.4', headers: { 'x-tenant-id': 'tenant-b' } });

    expect(first.res.statusCode).toBe(200);
    expect(second.res.statusCode).toBe(429);
  });
});

describe('security.rateLimiter provider adapters', () => {
  it('uses ioredis eval(script, 1, key, windowMs, limit)', async () => {
    const client = new MockEvalRedisClient();
    const store = new RedisStore(new IORedisAtomicClient(client), client as any);
    await store.incr('rl:test', 2000, 5);
    expect(client.calls).toHaveLength(1);
    expect(client.calls[0]).toMatchObject({
      provider: 'ioredis',
      numKeys: 1,
      key: 'rl:test',
      limitStr: '5',
      windowMsStr: '2000',
    });
  });


  it('falls back to in-memory store when ioredis eval fails once', async () => {
    const client = {
      calls: [] as unknown[],
      async eval(script: string, numKeys: number, key: string, windowMs: string, limit: string) {
        (client.calls as unknown[]).push({ script, numKeys, key, windowMs, limit });
        throw new Error('ioredis failure');
      },
    };
    // failOpen: true — this test exercises the opt-in fallback path. The default
    // (failOpen: false) is fail-closed by design; see the 503-on-outage test below.
    const store = new RedisStore(new IORedisAtomicClient(client as any), client as any, true);
    setRateLimiterStore(store);
    const app = express();
    app.get('/ping', rateLimiter, (_req, res) => res.status(200).send('ok'));
    const res = await request(app).get('/ping');
    expect(res.status).toBe(200);
    expect((client.calls as unknown[]).length).toBe(1);
  });


  it('rejects unsupported atomic client configurations', () => {
    expect(() => createAtomicRateLimitClient('ioredis', { eval: undefined })).toThrow();
    // Calling with an unsupported provider should also throw (use any to bypass TS literal typing)
    expect(() => (createAtomicRateLimitClient as any)('upstash', { eval: undefined })).toThrow();
  });

  it('falls back to in-memory store when REDIS_URL is missing in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.REDIS_URL;
    expect(() => createSharedRateLimitStoreFromEnv()).not.toThrow();
  });

  it('prevents test-only setters in production mode', () => {
    process.env.NODE_ENV = 'production';
    expect(() => setRateLimiterConfig({ maxRequests: 1 })).toThrow();
    expect(() => setRateLimiterStore({ incr: async () => ({ count: 1, resetAt: Date.now() + 1000 }) })).toThrow();
  });
});
