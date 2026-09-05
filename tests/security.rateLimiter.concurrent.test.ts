import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { rateLimiter, setRateLimiterStore, setRateLimiterConfig, createAtomicRateLimitClient, IORedisAtomicClient, createSharedRateLimitStoreFromEnv, RedisStore } from '../src/middleware/security';

class MockEvalRedisClient {
  public calls: Array<Record<string, unknown>> = [];
  private store = new Map<string, { val: number; expiresAt?: number }>();
  async eval(a: any, b: any, c?: any, ...rest: any[]) {
    if (typeof b !== 'number' || typeof c !== 'string') throw new Error('Unsupported eval signature');
    const key = c; const windowMsStr = rest[0]; const limitStr = rest[1];
    this.calls.push({ provider: 'ioredis', script: a, key, numKeys: b, args: [String(windowMsStr), String(limitStr)], windowMsStr, limitStr });
    const windowMs = Number(windowMsStr); const now = Date.now(); const rec = this.store.get(key);
    if (!rec || (rec.expiresAt && now > rec.expiresAt)) { this.store.set(key, { val: 1, expiresAt: now + windowMs }); return [1, windowMs]; }
    rec.val += 1; return [rec.val, (rec.expiresAt || now + windowMs) - now];
  }
}

function makeRateLimiterCall(store: { incr: (key: string, windowMs: number, limit: number) => Promise<any> }, options: { ip?: string; tenantId?: string; headers?: Record<string, string> } = {}) {
  setRateLimiterStore(store as any);
  const req: any = {
    ip: options.ip,
    path: '/ping',
    socket: { remoteAddress: options.ip },
    headers: options.headers || {},
    method: 'GET',
    url: '/ping',
  };
  if (options.tenantId) req.user = { tenantId: options.tenantId };
  const res: any = {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(k: string, v: string) { this.headers[k] = v; },
    status(c: number) { this.statusCode = c; return this; },
    json(b: unknown) { this.body = b; return this; },
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; return Promise.resolve(); };
  return rateLimiter(req, res, next).then(() => ({ req, res, nextCalled }));
}

const originalEnv = { ...process.env };
beforeEach(() => setRateLimiterConfig({ windowMs: 2000, maxRequests: 100 }));
afterEach(() => Object.assign(process.env, originalEnv));

describe('security.rateLimiter concurrency and failure', () => {
  it('enforces configured limit under high concurrency (mock redis)', async () => {
    const client = new MockEvalRedisClient();
    const store = new RedisStore(new IORedisAtomicClient(client), client as any);
    setRateLimiterConfig({ windowMs: 2000, maxRequests: 5 });
    const results = await Promise.all(Array.from({ length: 20 }, () => makeRateLimiterCall(store, { ip: '1.2.3.4' })));
    expect(results.filter(r => r.res.statusCode === 200)).toHaveLength(5);
    expect(results.filter(r => r.res.statusCode === 429)).toHaveLength(15);
    expect(client.calls).toHaveLength(20);
    expect(Number(results.find(r => r.res.statusCode === 200)!.res.headers['x-ratelimit-limit'])).toBe(5);
    expect(results.find(r => r.res.statusCode === 429)!.res.headers['retry-after']).toBeDefined();
  });

  it('returns 503 when shared store errors', async () => {
    const result = await makeRateLimiterCall({ incr: async () => { throw new Error('redis down'); } }, { ip: '1.2.3.4' });
    expect(result.res.statusCode).toBe(503);
  });

  it('invalid shared store count returns 503', async () => {
    const result = await makeRateLimiterCall({ incr: async () => ({ count: NaN, resetAt: Date.now() + 1000 }) }, { ip: '1.2.3.4' });
    expect(result.res.statusCode).toBe(503);
  });

  it('invalid shared store resetAt returns 503', async () => {
    const result = await makeRateLimiterCall({ incr: async () => ({ count: 1, resetAt: NaN }) }, { ip: '1.2.3.4' });
    expect(result.res.statusCode).toBe(503);
  });

  it('creates a fresh window after expiry', async () => {
    const c = new MockEvalRedisClient(); const s = new RedisStore(new IORedisAtomicClient(c), c as any);
    setRateLimiterConfig({ windowMs: 100, maxRequests: 1 });
    expect((await makeRateLimiterCall(s, { ip: '1.2.3.4' })).res.statusCode).toBe(200);
    expect((await makeRateLimiterCall(s, { ip: '1.2.3.4' })).res.statusCode).toBe(429);
    await new Promise(r => setTimeout(r, 120));
    expect((await makeRateLimiterCall(s, { ip: '1.2.3.4' })).res.statusCode).toBe(200);
  });

  it('shares one limit for the same tenant and ip', async () => {
    const c = new MockEvalRedisClient(); const s = new RedisStore(new IORedisAtomicClient(c), c as any);
    setRateLimiterConfig({ windowMs: 2000, maxRequests: 1 });
    const a = await makeRateLimiterCall(s, { ip: '1.2.3.4', tenantId: 'tenant-a' });
    const b = await makeRateLimiterCall(s, { ip: '1.2.3.4', tenantId: 'tenant-a' });
    expect(a.res.statusCode).toBe(200); expect(b.res.statusCode).toBe(429);
  });

  it('uses separate keys for different tenants', async () => {
    const c = new MockEvalRedisClient(); const s = new RedisStore(new IORedisAtomicClient(c), c as any);
    setRateLimiterConfig({ windowMs: 2000, maxRequests: 1 });
    const a = await makeRateLimiterCall(s, { ip: '1.2.3.4', tenantId: 'tenant-a' });
    const b = await makeRateLimiterCall(s, { ip: '1.2.3.4', tenantId: 'tenant-b' });
    expect(a.res.statusCode).toBe(200); expect(b.res.statusCode).toBe(200);
  });

  it('does not trust tenant headers', async () => {
    const c = new MockEvalRedisClient(); const s = new RedisStore(new IORedisAtomicClient(c), c as any);
    setRateLimiterConfig({ windowMs: 2000, maxRequests: 1 });
    const a = await makeRateLimiterCall(s, { ip: '1.2.3.4', headers: { 'x-tenant-id': 'tenant-a' } });
    const b = await makeRateLimiterCall(s, { ip: '1.2.3.4', headers: { 'x-tenant-id': 'tenant-b' } });
    expect(a.res.statusCode).toBe(200); expect(b.res.statusCode).toBe(429);
  });
});

describe('security.rateLimiter provider adapters', () => {
  it('uses ioredis eval with window and limit arguments', async () => {
    const c = new MockEvalRedisClient(); const s = new RedisStore(new IORedisAtomicClient(c), c as any);
    await s.incr('rl:test', 2000, 5);
    expect(c.calls[0]).toMatchObject({ provider: 'ioredis', numKeys: 1, key: 'rl:test', limitStr: '5', windowMsStr: '2000' });
  });
  it('rejects fail-open construction in production', () => {
    process.env.NODE_ENV = 'production';
    expect(() => new RedisStore({ increment: async () => { throw new Error('redis'); } }, undefined, true)).toThrow(/cannot fail open/);
  });
  it('rejects unsupported atomic client configurations', () => {
    expect(() => createAtomicRateLimitClient('ioredis', { eval: undefined })).toThrow();
    expect(() => (createAtomicRateLimitClient as any)('upstash', { eval: undefined })).toThrow();
  });
  it('fails closed when REDIS_URL is missing in production', () => {
    process.env.NODE_ENV = 'production'; delete process.env.REDIS_URL;
    expect(() => createSharedRateLimitStoreFromEnv()).toThrow(/REDIS_URL is required in production/);
  });
  it('prevents test-only setters in production', () => {
    process.env.NODE_ENV = 'production';
    expect(() => setRateLimiterConfig({ maxRequests: 1 })).toThrow();
    expect(() => setRateLimiterStore({ incr: async () => ({ count: 1, resetAt: Date.now() + 1000 }) })).toThrow();
  });
});
