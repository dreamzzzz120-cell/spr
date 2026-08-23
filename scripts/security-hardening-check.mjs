import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/middleware/security.ts', import.meta.url), 'utf8');
const failures = [];
const productionBlock = source.match(/export function createSharedRateLimitStoreFromEnv\(\): RateLimitStore \{([\s\S]*?)\n\}\n\nif \(config\.isProduction\)/)?.[1] ?? '';

// Production rate limiting must have a real shared store and must never silently downgrade.
if (/return new InMemoryStore\(\)/.test(productionBlock)) failures.push('Production rate limiter contains an in-memory fallback.');
if (/sharedStore\s*=\s*new InMemoryStore\(\)/.test(productionBlock)) failures.push('Production startup can replace the shared store with memory.');
if (/failOpen/.test(productionBlock)) failures.push('Production rate limiter exposes a fail-open path.');
if (!/REDIS_URL is required in production/.test(source)) failures.push('Missing explicit production Redis requirement.');
if (!/ioredis is required in production/.test(source)) failures.push('Missing explicit production ioredis requirement.');
if (!/RATE_LIMIT_STORE_UNAVAILABLE/.test(source)) failures.push('Missing fail-closed rate-limit response.');

if (failures.length) {
  console.error('Security hardening gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Security hardening checks passed.');
