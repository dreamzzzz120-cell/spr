import fs from 'node:fs';

const source = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
const failures = [];
const publicApi = new Set([
  '/api/health',
  '/api/status',
  '/api/billing/webhook',
  '/api/billing/success',
  '/api/billing/cancel',
]);

const routePattern = /app\.(get|post|put|patch|delete)\(\s*['"](\/api\/[^'"]+)['"]\s*,([\s\S]*?)(?=\n\s*\);)/g;
let match;
while ((match = routePattern.exec(source))) {
  const [, method, path, middlewareAndHandler] = match;
  if (publicApi.has(path)) continue;
  if (!/\brequireAuth\b/.test(middlewareAndHandler)) failures.push(`${method.toUpperCase()} ${path} is missing requireAuth.`);
}

if (!/app\.use\('\/api',\s*rateLimiter\)/.test(source)) failures.push('Global /api rate limiter middleware is missing.');
if (!/app\.use\('\/api',\s*createMonitoringRouter\(\)\)/.test(source)) failures.push('Monitoring router is not mounted under /api.');
if (!/express\.json\(\{[\s\S]*limit:\s*['"]15mb['"]/.test(source)) failures.push('JSON body-size limit is missing.');
if (!/stripe\.webhooks\.constructEvent\(req\.rawBody,\s*sig,\s*webhookSecret\)/.test(source)) failures.push('Stripe webhook signature verification is missing.');
if (!/credentials:\s*true/.test(source)) failures.push('CORS credential policy is not explicitly configured.');
if (!/app\.disable\('x-powered-by'\)/.test(source)) failures.push('Express x-powered-by header is not disabled.');
if (!/helmet\(/.test(source)) failures.push('Helmet security middleware is missing.');

if (failures.length) {
  console.error('Route security hardening gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Route security hardening checks passed.');
