import fs from 'node:fs';

const securityPath = new URL('../src/middleware/security.ts', import.meta.url);
const source = fs.readFileSync(securityPath, 'utf8');
const failures = [];

// Production rate limiting must never silently downgrade to per-instance memory.
if (/if \(!redisUrl\)[\s\S]{0,500}return new InMemoryStore\(\)/.test(source)) {
  failures.push('Production rate limiter falls back to in-memory storage when REDIS_URL is missing.');
}
if (/if \(!hasIoredis \|\| !IORedis\)[\s\S]{0,500}return new InMemoryStore\(\)/.test(source)) {
  failures.push('Production rate limiter falls back to in-memory storage when ioredis is unavailable.');
}
if (/sharedStore = new InMemoryStore\(\)/.test(source)) {
  failures.push('Security middleware contains a runtime path that replaces the shared rate-limit store with in-memory storage.');
}

if (failures.length) {
  console.error('Security hardening gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Security hardening checks passed.');
