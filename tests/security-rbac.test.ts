import { describe, expect, it, beforeEach } from 'vitest';
import {
  requireRole,
  rateLimiter,
  setRateLimiterConfig,
  setRateLimiterStore,
} from '../src/middleware/security.ts';

function responseDouble() {
  const headers = new Map<string, string>();
  const response: any = {
    statusCode: 200,
    body: undefined,
    headers,
    setHeader(name: string, value: string) { headers.set(name, value); return response; },
    status(code: number) { response.statusCode = code; return response; },
    json(body: unknown) { response.body = body; return response; },
  };
  return response;
}

function requestDouble(role?: string) {
  return {
    ip: '203.0.113.10',
    path: '/api/ping',
    method: 'GET',
    url: '/api/ping',
    headers: {},
    socket: { remoteAddress: '203.0.113.10' },
    user: role ? { id: 1, uid: 'uid-test', email: 'test@example.invalid', tenantId: 'tenant-a', role, emailVerified: true } : undefined,
  } as any;
}

describe('security middleware attack regressions', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    setRateLimiterConfig({ windowMs: 60_000, maxRequests: 100 });
  });

  it('does not allow a lower role to satisfy an Owner-only route', () => {
    const next = () => undefined;
    for (const role of ['Viewer', 'Technician', 'Admin', 'Auditor']) {
      const res = responseDouble();
      requireRole(['Owner'])(requestDouble(role), res, next);
      expect(res.statusCode).toBe(403);
    }
    const res = responseDouble();
    let called = false;
    requireRole(['Owner'])(requestDouble('Owner'), res, () => { called = true; });
    expect(called).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it('does not allow an unknown role to pass any RBAC allowlist', () => {
    expect(() => requireRole(['DefinitelyNotARole'])).toThrow(/Invalid RBAC allowlist/);
    const res = responseDouble();
    requireRole(['Admin'])(requestDouble('DefinitelyNotARole'), res, () => undefined);
    expect(res.statusCode).toBe(403);
  });

  it('fails closed when the shared rate-limit store is unavailable', async () => {
    setRateLimiterStore({ async incr() { throw new Error('redis unavailable'); } });
    const res = responseDouble();
    await rateLimiter(requestDouble(), res, () => { throw new Error('must not call next'); });
    expect(res.statusCode).toBe(503);
    expect(res.body?.error?.code).toBe('RATE_LIMIT_STORE_UNAVAILABLE');
  });

  it('enforces the configured request ceiling', async () => {
    setRateLimiterConfig({ windowMs: 60_000, maxRequests: 1 });
    const counts = new Map<string, number>();
    setRateLimiterStore({
      async incr(key, windowMs) {
        const count = (counts.get(key) || 0) + 1;
        counts.set(key, count);
        return { count, resetAt: Date.now() + windowMs };
      },
    });
    const first = responseDouble();
    let firstNext = false;
    await rateLimiter(requestDouble(), first, () => { firstNext = true; });
    expect(firstNext).toBe(true);
    expect(first.statusCode).toBe(200);
    const second = responseDouble();
    let secondNext = false;
    await rateLimiter(requestDouble(), second, () => { secondNext = true; });
    expect(secondNext).toBe(false);
    expect(second.statusCode).toBe(429);
  });
});
