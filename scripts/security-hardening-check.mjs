import fs from 'node:fs';

const securitySource = fs.readFileSync(new URL('../src/middleware/security.ts', import.meta.url), 'utf8');
const dockerSource = fs.readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
const workerDockerSource = fs.readFileSync(new URL('../Dockerfile.worker', import.meta.url), 'utf8');
const failures = [];

const productionBlock = securitySource.match(/export function createSharedRateLimitStoreFromEnv\(\): RateLimitStore \{([\s\S]*?)\n\}\n\nif \(config\.isProduction\)/)?.[1] ?? '';

// Production rate limiting must have a real shared store and must never silently downgrade.
if (/return new InMemoryStore\(\)/.test(productionBlock)) failures.push('Production rate limiter contains an in-memory fallback.');
if (/sharedStore\s*=\s*new InMemoryStore\(\)/.test(productionBlock)) failures.push('Production startup can replace the shared store with memory.');
if (/failOpen/.test(productionBlock)) failures.push('Production rate limiter exposes a fail-open path.');
if (!/REDIS_URL is required in production/.test(securitySource)) failures.push('Missing explicit production Redis requirement.');
if (!/ioredis is required in production/.test(securitySource)) failures.push('Missing explicit production ioredis requirement.');
if (!/RATE_LIMIT_STORE_UNAVAILABLE/.test(securitySource)) failures.push('Missing fail-closed rate-limit response.');

// Runtime must match the Node 22 baseline used by CI and the installed Firebase/Admin stack.
for (const [name, source] of [['Dockerfile', dockerSource], ['Dockerfile.worker', workerDockerSource]]) {
  if (/FROM\s+node:20(?:[-@\s]|$)/m.test(source)) failures.push(`${name} still uses Node 20; production baseline is Node 22.`);
  if (!/FROM\s+node:22(?:[-@\s]|$)/m.test(source)) failures.push(`${name} is missing an explicit Node 22 base image.`);
  if (!/USER\s+node\b/.test(source)) failures.push(`${name} does not drop to the non-root node user.`);
  if (/raw\.githubusercontent\.com\/anchore\/syft\/main\/install\.sh/.test(source)) failures.push(`${name} installs Syft from the mutable main branch.`);
  if (!/raw\.githubusercontent\.com\/anchore\/syft\/v1\.49\.0\/install\.sh/.test(source)) failures.push(`${name} is missing the pinned Syft installer revision.`);
}

if (failures.length) {
  console.error('Security hardening gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Security hardening checks passed.');
