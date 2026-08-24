import { spawn } from 'node:child_process';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
const routes = [];
const pattern = /app\.(get|post|put|patch|delete)\(\s*['"](\/api\/[^'"]+)['"]/g;
let match;
while ((match = pattern.exec(source))) routes.push({ method: match[1].toUpperCase(), path: match[2] });

const publicRoutes = new Set([
  'GET /api/health',
  'GET /api/status',
  'POST /api/billing/webhook',
  'GET /api/billing/success',
  'GET /api/billing/cancel',
]);

const protectedRoutes = routes.filter(route => !publicRoutes.has(`${route.method} ${route.path}`));
const port = String(3900 + (process.pid % 100));
const child = spawn(process.execPath, ['--import', 'tsx', 'server-entry.ts'], {
  env: { ...process.env, NODE_ENV: 'test', SKIP_DOTENV: 'true', PORT: port },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
child.stdout.on('data', chunk => { output += chunk.toString(); });
child.stderr.on('data', chunk => { output += chunk.toString(); });

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const request = async (method, path, body = undefined) => {
  const concretePath = path.replace(/:[A-Za-z0-9_-]+/g, 'security-test-id');
  return fetch(`http://127.0.0.1:${port}${concretePath}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ? '{}' : body,
    redirect: 'manual',
  });
};

try {
  let ready = false;
  for (let i = 0; i < 60; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.status === 200) { ready = true; break; }
    } catch {}
    await sleep(500);
  }
  if (!ready) throw new Error(`Server did not become ready.\n${output}`);

  const failures = [];
  for (const route of protectedRoutes) {
    const response = await request(route.method, route.path);
    if (![401, 403].includes(response.status)) {
      failures.push(`${route.method} ${route.path} returned ${response.status}; expected 401/403 without credentials`);
    }
  }

  // Agent Trust intentionally has two server-to-server endpoints that are not
  // Firebase-authenticated. They must reject requests without the dedicated
  // agent bearer key before touching agent state.
  for (const path of ['/api/agent-trust/authorize', '/api/agent-trust/events']) {
    const response = await request('POST', path);
    if (response.status !== 401) {
      failures.push(`POST ${path} returned ${response.status}; expected 401 without X-SPR-Agent-Key`);
    }
  }

  if (failures.length) {
    console.error('Unauthenticated route attack test failed:');
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exitCode = 1;
  } else {
    console.log(`Unauthenticated route attack test passed for ${protectedRoutes.length} protected routes plus AI Agent Trust key gates.`);
  }
} finally {
  child.kill('SIGTERM');
  await sleep(250);
  if (!child.killed) child.kill('SIGKILL');
}
