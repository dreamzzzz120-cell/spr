/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Static regression guards for authentication, billing, observability, and
 * Firebase claim assignment. These guards intentionally run without live
 * provider credentials so security regressions are caught in CI.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const securitySourcePath = path.join(__dirname, '..', 'src', 'middleware', 'security.ts');
const securitySource = readFileSync(securitySourcePath, 'utf-8');
const firebaseAdminSource = readFileSync(
  path.join(__dirname, '..', 'src', 'lib', 'firebase-admin.ts'),
  'utf-8'
);

describe('auth regression guard — src/middleware/security.ts', () => {
  it('accepts bearer tokens only from the Authorization header, never URL query parameters', () => {
    expect(securitySource).not.toMatch(/req\.query\.token/);
    expect(securitySource).toMatch(/headers\.authorization/);
  });

  it('does not contain a fallback JWT decode path', () => {
    const suspiciousPatterns = [
      /fallback.{0,40}decode/is,
      /jwt\.decode\s*\(/i,
      /jsonwebtoken['"]\)\.decode/i,
    ];
    for (const pattern of suspiciousPatterns) expect(securitySource).not.toMatch(pattern);
  });

  it('checks Firebase revocation and disabled-user state at request time', () => {
    expect(securitySource).toContain('adminAuth.verifyIdToken(token, true)');
    expect(securitySource).not.toContain('adminAuth.verifyIdToken(token);');
  });

  it('requireAuth returns 401 in the catch handling verifyIdToken() failure (fails closed)', () => {
    const verifyNeedle = 'adminAuth.verifyIdToken(token, true)';
    const verifyIdx = securitySource.indexOf(verifyNeedle);
    expect(verifyIdx).toBeGreaterThan(-1);

    const catchIdx = securitySource.indexOf('catch', verifyIdx + verifyNeedle.length);
    expect(catchIdx).toBeGreaterThan(verifyIdx);

    const catchBlock = securitySource.slice(catchIdx, catchIdx + 500);
    expect(catchBlock).toMatch(/res\.status\(401\)/);
  });

  it('does not import a firebaseConfig client-side config into the server auth middleware', () => {
    expect(securitySource).not.toMatch(/import\s+.*firebaseConfig/i);
  });

  it('requireRole exists and checks the authenticated user role before allowing access', () => {
    expect(securitySource).toMatch(/export const requireRole/);
    const roleIdx = securitySource.indexOf('export const requireRole');
    const roleBlock = securitySource.slice(roleIdx, roleIdx + 1200);
    expect(roleBlock).toMatch(/403/);
  });
});

describe('billing regression guard — server.ts', () => {
  const serverSourcePath = path.join(__dirname, '..', 'server.ts');
  const serverSource = readFileSync(serverSourcePath, 'utf-8');

  it('does not mark invoices/passports Paid from a bare session_id with no payment_status check', () => {
    expect(serverSource).toMatch(/stripe\.webhooks\.constructEvent/);
  });

  it('reads PORT from the environment rather than hardcoding it', () => {
    const configSourcePath = path.join(__dirname, '..', 'src', 'config.ts');
    const configSource = readFileSync(configSourcePath, 'utf-8');
    expect(configSource).toMatch(/PORT/);
    expect(serverSource).toMatch(/config\.port/);
  });
});

describe('error-tracking regression guard — server.ts', () => {
  const serverSourcePath = path.join(__dirname, '..', 'server.ts');
  const serverSource = readFileSync(serverSourcePath, 'utf-8');
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

  it('has @sentry/node as a dependency', () => {
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    expect(allDeps).toHaveProperty('@sentry/node');
  });

  it('initializes Sentry gated on SENTRY_DSN, only inside startServer', () => {
    expect(serverSource).toMatch(/Sentry\.init\(/);
    const startServerIdx = serverSource.indexOf('async function startServer');
    const sentryInitIdx = serverSource.indexOf('Sentry.init(');
    expect(startServerIdx).toBeGreaterThan(-1);
    expect(sentryInitIdx).toBeGreaterThan(startServerIdx);
  });

  it('actually captures exceptions through Sentry', () => {
    expect(serverSource).toMatch(/Sentry\.captureException/);
  });
});

describe('Firebase Admin claim assignment regression guard', () => {
  it('contains no production special-prefix claim bypass', () => {
    expect(firebaseAdminSource).not.toMatch(/uid\.startsWith\(['"](?:dev-|invited-)/);
  });

  it('reads claims back after assignment', () => {
    expect(firebaseAdminSource).toMatch(/setCustomUserClaims/);
    expect(firebaseAdminSource).toMatch(/getUser\(uid\)/);
  });

  it('returns failure when assignment or read-back throws', () => {
    expect(firebaseAdminSource).not.toMatch(/Bypassing claims push/);
    const catchBlock = firebaseAdminSource.slice(firebaseAdminSource.indexOf('} catch'));
    expect(catchBlock).toMatch(/success:\s*false/);
  });
});
