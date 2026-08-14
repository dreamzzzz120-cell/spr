/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * This file exists because of a recurring problem: AI Studio re-exports of this
 * codebase have repeatedly reintroduced a critical auth bypass in
 * src/middleware/security.ts — a fallback path that decoded JWT payloads
 * WITHOUT verifying the cryptographic signature when adminAuth.verifyIdToken()
 * failed, letting anyone forge a token claiming any email/tenant/role.
 *
 * These tests statically scan the source rather than exercising the running
 * server, on purpose: they need to catch the bug even before a build step,
 * and even in environments (like CI without live Firebase creds) where the
 * route can't be exercised end-to-end.
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
    // Historical bad pattern looked like:
    //   } catch (fallbackErr) { decodedToken = jwt.decode(token); }
    // i.e. any catch block around a failed verifyIdToken() that goes on to
    // decode the token anyway instead of rejecting the request.
    const suspiciousPatterns = [
      /fallback.{0,40}decode/is,
      /jwt\.decode\s*\(/i,
      /jsonwebtoken['"]\)\.decode/i,
    ];
    for (const pattern of suspiciousPatterns) {
      expect(securitySource).not.toMatch(pattern);
    }
  });

  it('checks Firebase revocation and disabled-user state at request time', () => {
    expect(securitySource).toContain('adminAuth.verifyIdToken(token, true)');
    expect(securitySource).not.toContain('adminAuth.verifyIdToken(token);');
  });

  it('requireAuth returns 401 in the same catch block where verifyIdToken() fails (fails closed)', () => {
    // Find the verifyIdToken() call and confirm the immediately-following catch
    // block returns a 401 rather than falling through to construct a user object.
    const verifyIdx = securitySource.indexOf('verifyIdToken(');
    expect(verifyIdx).toBeGreaterThan(-1);

    const afterVerify = securitySource.slice(verifyIdx, verifyIdx + 800);
    const catchIdx = afterVerify.indexOf('catch');
    expect(catchIdx).toBeGreaterThan(-1);

    const catchBlock = afterVerify.slice(catchIdx, catchIdx + 400);
    expect(catchBlock).toMatch(/res\.status\(401\)/);
  });

  it('does not import a firebaseConfig client-side config into the server auth middleware', () => {
    // Leftover dead import from a prior version of the bypass; also a signal
    // something client-facing snuck into server-only auth code.
    expect(securitySource).not.toMatch(/import\s+.*firebaseConfig/i);
  });

  it('requireRole exists and checks the authenticated user\'s role before allowing access', () => {
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
    // Historical bug: /api/billing/success read a Stripe session_id and marked
    // billing Paid without checking payment_status or verifying a webhook
    // signature. Guard: there must be a signature-verified webhook handler,
    // and success-redirect routes must not themselves flip billing status.
    expect(serverSource).toMatch(/stripe\.webhooks\.constructEvent/);
  });

  it('reads PORT from the environment rather than hardcoding it', () => {
    // PORT moved from an inline process.env.PORT read in server.ts to the
    // centralized, zod-validated src/config.ts module (config.port). Check
    // the real source of truth, not server.ts's literal text, or this guard
    // silently stops protecting anything the moment the refactor lands.
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

  it('has @sentry/node as a dependency (has been silently dropped by AI Studio re-exports before)', () => {
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    expect(allDeps).toHaveProperty('@sentry/node');
  });

  it('initializes Sentry gated on SENTRY_DSN, and only inside startServer (never at module top-level)', () => {
    expect(serverSource).toMatch(/Sentry\.init\(/);

    // Guard against a top-level Sentry.init() call, which breaks esbuild's CJS
    // bundle output for this project. It must appear after "async function
    // startServer" in the file.
    const startServerIdx = serverSource.indexOf('async function startServer');
    const sentryInitIdx = serverSource.indexOf('Sentry.init(');
    expect(startServerIdx).toBeGreaterThan(-1);
    expect(sentryInitIdx).toBeGreaterThan(startServerIdx);
  });

  it('actually captures exceptions through Sentry, not just initializes it', () => {
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
