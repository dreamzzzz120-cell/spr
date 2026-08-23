import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { adminAuth, setUserCustomClaims } from '../lib/firebase-admin.ts';
import { config } from '../config.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export interface AuthenticatedRequest extends Request {
  user?: { id: number; uid: string; email: string; tenantId: string; role: string; emailVerified: boolean };
}

let rateLimitWindowMs = 60 * 1000;
let maxRequestsPerWindow = 100;
const isTestMode = () => process.env.NODE_ENV !== 'production';

export function setRateLimiterConfig(opts: { windowMs?: number; maxRequests?: number }) {
  if (!isTestMode()) throw new Error('setRateLimiterConfig is only available in test mode');
  if (typeof opts.windowMs === 'number') rateLimitWindowMs = opts.windowMs;
  if (typeof opts.maxRequests === 'number') maxRequestsPerWindow = opts.maxRequests;
}

interface RateLimitRecord { count: number; resetAt: number; }
interface RateLimitStore { incr(key: string, windowMs: number, limit: number): Promise<RateLimitRecord>; }

class InMemoryStore implements RateLimitStore {
  private map = new Map<string, { count: number; resetAt: number }>();
  async incr(key: string, windowMs: number) {
    const now = Date.now(); const rec = this.map.get(key);
    if (!rec || now > rec.resetAt) { const next = { count: 1, resetAt: now + windowMs }; this.map.set(key, next); return next; }
    rec.count += 1; return rec;
  }
}

interface AtomicRateLimitClient { increment(script: string, key: string, windowMs: number, limit?: number): Promise<unknown>; }
export class IORedisAtomicClient implements AtomicRateLimitClient {
  constructor(private readonly client: { eval(script: string, numKeys: number, ...args: Array<string | number>): Promise<unknown> }) {}
  increment(script: string, key: string, windowMs: number, limit = maxRequestsPerWindow) { return this.client.eval(script, 1, key, String(windowMs), String(limit)); }
}
export function createAtomicRateLimitClient(provider: 'ioredis', client: any): AtomicRateLimitClient {
  if (provider !== 'ioredis' || !client || typeof client.eval !== 'function') throw new Error('Invalid ioredis rate-limit client');
  return new IORedisAtomicClient(client);
}

export class RedisStore implements RateLimitStore {
  private readonly lua = 'local count = redis.call("INCR", KEYS[1])\nlocal ttl = redis.call("PTTL", KEYS[1])\nif count == 1 or ttl < 0 then redis.call("PEXPIRE", KEYS[1], ARGV[1]); ttl = tonumber(ARGV[1]) end\nreturn {count, ttl}';
  constructor(private readonly atomicClient: AtomicRateLimitClient, _legacyClient?: unknown, failOpen = false) {
    if (failOpen) throw new Error('Production rate limiter cannot fail open');
  }
  async incr(key: string, windowMs: number, limit: number) {
    const res = await this.atomicClient.increment(this.lua, key, windowMs, limit);
    if (!Array.isArray(res) || res.length < 2) throw new Error('Invalid Redis rate-limit response');
    const count = Number(res[0]); const ttl = Number(res[1]);
    if (!Number.isFinite(count) || count < 1 || !Number.isFinite(ttl) || ttl <= 0) throw new Error('Invalid Redis rate-limit values');
    return { count, resetAt: Date.now() + ttl };
  }
}

let sharedStore: RateLimitStore = new InMemoryStore();
let IORedis: any = null;
try { IORedis = require('ioredis'); } catch {}

export function createSharedRateLimitStoreFromEnv(): RateLimitStore {
  const production = config.isProduction || process.env.NODE_ENV === 'production';
  if (!production) return new InMemoryStore();
  const redisUrl = config.redis.url || process.env.REDIS_URL;
  if (!redisUrl) throw new Error('REDIS_URL is required in production for security rate limiting');
  if (!IORedis) throw new Error('ioredis is required in production for security rate limiting');
  const client = new IORedis(redisUrl, { lazyConnect: false, enableReadyCheck: true, maxRetriesPerRequest: 1, reconnectOnError: () => true });
  client.on('error', (err: Error) => console.error('[RateLimiter] Redis error:', err.message));
  client.on('end', () => console.error('[RateLimiter] Redis connection ended; requests will fail closed until Redis recovers.'));
  return new RedisStore(createAtomicRateLimitClient('ioredis', client));
}
if (config.isProduction) sharedStore = createSharedRateLimitStoreFromEnv();

export function setRateLimiterStore(s: RateLimitStore) {
  if (!isTestMode()) throw new Error('setRateLimiterStore is only available in test mode');
  sharedStore = s;
}

export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const tenantId = (req as AuthenticatedRequest).user?.tenantId;
  const key = tenantId ? `rl:tenant:${tenantId}:ip:${ip}` : `rl:ip:${ip}`;
  try {
    const counter = await sharedStore.incr(key, rateLimitWindowMs, maxRequestsPerWindow);
    if (!counter || !Number.isFinite(Number(counter.count)) || Number(counter.count) < 1 || !Number.isFinite(Number(counter.resetAt)) || Number(counter.resetAt) <= 0) throw new Error('Invalid rate-limit store result');
    const remaining = Math.max(0, maxRequestsPerWindow - Number(counter.count));
    res.setHeader('X-RateLimit-Limit', String(maxRequestsPerWindow));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(Number(counter.resetAt) / 1000)));
    if (Number(counter.count) > maxRequestsPerWindow) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((Number(counter.resetAt) - Date.now()) / 1000))));
      return res.status(429).json({ error: 'Too Many Requests' });
    }
    return next();
  } catch (err: any) {
    const requestId = randomUUID();
    console.error('[RateLimiter] FAIL-CLOSED request=%s error=%s', requestId, err?.message || err);
    return res.status(503).json({ error: { code: 'RATE_LIMIT_STORE_UNAVAILABLE', message: 'This operation is temporarily unavailable.', requestId } });
  }
};

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let token = '';
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7).trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization token' });
  try {
    const decodedToken: any = await adminAuth.verifyIdToken(token, true); // catch -> res.status(401) below; authentication fails closed.
    const uid = decodedToken.uid; const email = decodedToken.email || `${uid}@user.local`; const emailVerified = !!decodedToken.email_verified;
    const exempt = req.path === '/api/user/me' || req.path === '/api/auth/resend-verification' || req.path === '/api/auth/verify-status';
    if (!emailVerified && !exempt) return res.status(403).json({ error: 'Email verification required', code: 'EMAIL_NOT_VERIFIED', message: 'Your email address must be verified before accessing workspace resources.' });
    const defaultTenantId = `tenant-${uid}`;
    let dbUser = await db.select().from(users).where(eq(users.uid, uid)).then(rows => rows[0]);
    if (!dbUser) {
      dbUser = await db.select().from(users).where(eq(users.email, email)).then(rows => rows[0]);
      if (dbUser) {
        const previousUid = dbUser.uid; const previousOnboarded = dbUser.onboarded;
        const updated = await db.update(users).set({ uid, onboarded: 1 }).where(eq(users.id, dbUser.id)).returning(); dbUser = updated[0];
        const claimRes = await setUserCustomClaims(uid, { workspaceId: dbUser.tenantId, role: dbUser.role });
        if (!claimRes.success) { await db.update(users).set({ uid: previousUid, onboarded: previousOnboarded }).where(eq(users.id, dbUser.id)); return res.status(403).json({ error: 'Forbidden: Security claim assignment failed' }); }
      } else {
        const inserted = await db.insert(users).values({ uid, email, tenantId: defaultTenantId, role: 'Viewer', onboarded: 0 }).onConflictDoUpdate({ target: users.uid, set: { email } }).returning(); dbUser = inserted[0];
        const claimRes = await setUserCustomClaims(uid, { workspaceId: dbUser.tenantId, role: dbUser.role });
        if (!claimRes.success) { await db.delete(users).where(eq(users.id, dbUser.id)); return res.status(403).json({ error: 'Forbidden: Security claim assignment failed' }); }
      }
    }
    const claimRole = decodedToken.role; const claimWorkspace = decodedToken.workspaceId || decodedToken.tenantId;
    if (!claimRole || !claimWorkspace) { await setUserCustomClaims(uid, { workspaceId: dbUser.tenantId, role: dbUser.role }); return res.status(401).json({ error: 'Authentication context refresh required' }); }
    if (claimWorkspace !== dbUser.tenantId || claimRole !== dbUser.role) return res.status(403).json({ error: 'Forbidden: Authentication context does not match account authorization' });
    req.user = { id: dbUser.id, uid: dbUser.uid, email: dbUser.email, tenantId: dbUser.tenantId, role: dbUser.role, emailVerified }; return next();
  } catch (err: any) {
    const requestId = randomUUID(); console.error('[Auth] Verification failure request=%s error=%s', requestId, err?.message || err);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired security token', requestId });
  }
};

const ROLE_NAMES = new Set(['Viewer', 'Technician', 'Admin', 'Owner', 'Auditor']);
export const requireRole = (allowedRoles: string[]) => {
  if (allowedRoles.length === 0 || allowedRoles.some(role => !ROLE_NAMES.has(role))) throw new Error(`Invalid RBAC allowlist: ${allowedRoles.join(', ')}`);
  const effectiveRoles = new Set(allowedRoles);
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    if (!effectiveRoles.has(req.user.role)) return res.status(403).json({ error: 'Forbidden: Insufficient privileges', message: `Your role (${req.user.role}) does not have permission to access this resource.` });
    return next();
  };
};
