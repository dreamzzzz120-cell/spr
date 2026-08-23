import fs from 'node:fs';

const securityPath = new URL('../src/middleware/security.ts', import.meta.url);
const source = fs.readFileSync(securityPath, 'utf8');
const failures = [];

// Production rate limiting must never silently downgrade to per-instance memory.
const productionBlock = source.match(/export function createSharedRateLimitStoreFromEnv\(\): RateLimitStore \{([\s\S]*?)\n\}\n\nif \(config\.isProduction\)/)?.[1] ?? '';

if (/if \(!redisUrl\)[\s\S]{0,500}return new InMemoryStore\(\)/.test(productionBlock)) {
  failures.push('Production rate limiter falls back to in-memory storage when REDIS_URL is missing.');
}
if (/if \(!hasIoredis \|\| !IORedis\)[\s\S]{0,500}return new InMemoryStore\(\)/.test(productionBlock)) {
  failures.push('Production rate limiter falls back to in-memory storage when ioredis is unavailable.');
}
if (/client\.connect\(\)\.catch\([\s\S]{0,500}sharedStore = new InMemoryStore\(\)/.test(productionBlock)) {
  failures.push('Redis startup failure replaces the production rate limiter with an in-memory store.');
}

if (failures.length) {
  console.error('Security hardening gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Security hardening checks passed.');
