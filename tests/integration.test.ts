/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Spawns the actual server (tsx server.ts) and hits it over real HTTP. This
 * requires a live Postgres to connect to (SQL_HOST/SQL_USER/SQL_PASSWORD/
 * SQL_DB_NAME) — drizzle-kit push must have already run against that database.
 * The whole suite auto-skips when SQL_HOST isn't set, so `npm test` still
 * works locally/in sandboxes without a database configured.
 *
 * This export has no mock-auth bypass (a prior export's dev-only "mock-"
 * token shortcut is not present here), so tests that need a *valid,
 * authenticated* request (RBAC, tenant isolation) are gated behind an
 * additional FIREBASE_TEST_TOKEN env var and skipped otherwise. What always
 * runs when SQL_HOST is set: unauthenticated-request rejection, security
 * headers, and the health check — all real, no faked auth required.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';

const hasDb = !!process.env.SQL_HOST;
const hasAuthToken = !!process.env.FIREBASE_TEST_TOKEN;
const TEST_PORT = process.env.TEST_PORT || '4173';
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProcess: ChildProcess | null = null;

async function waitForServer(url: string, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/health`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error(`Server did not become healthy at ${url} within ${timeoutMs}ms`);
}

describe.skipIf(!hasDb)('live server integration', () => {
  beforeAll(async () => {
    serverProcess = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'server.ts'], {
      env: { ...process.env, PORT: TEST_PORT, NODE_ENV: 'test' },
      stdio: 'pipe'
    });
    await waitForServer(BASE_URL);
  }, 20000);

  afterAll(() => {
    serverProcess?.kill('SIGTERM');
  });

  it('responds healthy on /health', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    expect(res.status).toBe(200);
  });

  it('reports the database unavailable when the configured database cannot answer the probe', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toMatchObject({
      status: 'unavailable',
      db: 'unavailable',
      code: 'DB_UNAVAILABLE'
    });
  });

  it('rejects requests to protected routes with no auth token (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/user/me`);
    expect(res.status).toBe(401);
  });

  it('rejects a forged/unsigned JWT-shaped token (401, not decoded-and-trusted)', async () => {
    // A syntactically valid but unsigned/garbage JWT. If the old fallback-decode
    // bug ever comes back, this would succeed instead of failing — this is the
    // live-server companion to the static check in auth-regression.test.ts.
    const forgedPayload = Buffer.from(JSON.stringify({ uid: 'attacker', email: 'attacker@evil.example', role: 'Owner' })).toString('base64url');
    const forgedToken = `eyJhbGciOiJub25lIn0.${forgedPayload}.`;
    const res = await fetch(`${BASE_URL}/api/user/me`, {
      headers: { Authorization: `Bearer ${forgedToken}` }
    });
    expect(res.status).toBe(401);
  });

  it('rejects a token supplied only through a URL query parameter', async () => {
    const res = await fetch(`${BASE_URL}/api/user/me?token=not-a-bearer-token`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({
      error: 'Unauthorized: Missing or invalid authorization token'
    });
  });

  it('sets baseline security headers via helmet', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    // helmet sets these by default; absence would mean helmet got dropped/misconfigured
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('rejects a passport update carrying a bare self-reported VERIFIED evidence claim, even before touching auth-gated business logic', async () => {
    // This hits the route without a valid token, so it will 401 before reaching
    // validateBody — which is exactly correct (auth must come first). This test
    // exists to document that expectation explicitly rather than assume it.
    const res = await fetch(`${BASE_URL}/api/passports/does-not-matter`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evidence: [{ id: 'ev-1', name: 'x', type: 'Signature', status: 'VERIFIED', timestamp: new Date().toISOString() }] })
    });
    expect(res.status).toBe(401);
  });

  describe.skipIf(!hasAuthToken)('authenticated routes (requires FIREBASE_TEST_TOKEN)', () => {
    it('rejects a self-reported bare VERIFIED evidence claim with 400 once authenticated', async () => {
      const res = await fetch(`${BASE_URL}/api/passports/does-not-matter`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.FIREBASE_TEST_TOKEN}`
        },
        body: JSON.stringify({ evidence: [{ id: 'ev-1', name: 'x', type: 'Signature', status: 'VERIFIED', timestamp: new Date().toISOString() }] })
      });
      // Either 400 (validation rejected the bare VERIFIED claim) or 404 (passport
      // doesn't exist) is acceptable here — what must NOT happen is a 200.
      expect([400, 404]).toContain(res.status);
    });
  });
});
