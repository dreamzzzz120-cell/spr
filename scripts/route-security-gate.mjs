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
  if (!/\brequireAuth\b/.test(middlewareAndHandler)) {
    failures.push(`${method.toUpperCase()} ${path} is missing requireAuth.`);
  }
}

// Sensitive state-changing APIs must also have an explicit role gate unless they are
// deliberately available to every authenticated workspace member.
const privilegedRoutePattern = /app\.(post|put|patch|delete)\(\s*['"](\/api\/[^'"]+)['"]\s*,([\s\S]*?)(?=\n\s*\);)/g;
while ((match = privilegedRoutePattern.exec(source))) {
  const [, method, path, middlewareAndHandler] = match;
  if (publicApi.has(path)) continue;
  if (/\b(requireAuth)\b/.test(middlewareAndHandler) && !/\brequireRole\s*\(/.test(middlewareAndHandler)) {
    // Explicitly allowed authenticated-user operations.
    const allowed = [
      '/api/auth/record-login',
      '/api/auth/sessions/revoke',
      '/api/user/profile',
      '/api/user/role',
      '/api/organization/security/verify-mfa',
      '/api/organization/security',
      '/api/alerts',
      '/api/ai/analyze-passport',
      '/api/ai/advisor',
      '/api/billing/checkout',
      '/api/repository-connections',
    ];
    if (!allowed.includes(path)) failures.push(`${method.toUpperCase()} ${path} changes state without an explicit requireRole gate.`);
  }
}

if (!/app\.use\('\/api',\s*rateLimiter\)/.test(source)) failures.push('Global /api rate limiter middleware is missing.');
if (!/app\.use\('\/api',\s*createMonitoringRouter\(\)\)/.test(source)) failures.push('Monitoring router is not mounted under /api.');
if (!/express\.json\(\{[\s\S]*limit:\s*['"]15mb['"]/.test(source)) failures.push('JSON body-size limit is missing.');
if (!/stripe\.webhooks\.constructEvent\(req\.rawBody,\s*sig,\s*webhookSecret\)/.test(source)) failures.push('Stripe webhook signature verification is missing.');

if (failures.length) {
  console.error('Route security hardening gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Route security hardening checks passed.');
