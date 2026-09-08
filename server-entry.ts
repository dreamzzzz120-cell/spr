/**
 * Hardened production entrypoint.
 *
 * server.ts owns the existing application. This compatibility entrypoint
 * mounts security-sensitive additive routers without replacing Express internals.
 */
import express from 'express';
import { createAgentTrustRouter } from './src/routes/agent-trust.ts';
import { createReportEntitlementRouter } from './src/routes/report-entitlements.ts';

const originalUse = express.application.use;
let additiveRoutersMounted = false;

express.application.use = function patchedUse(this: any, ...args: any[]) {
  const result = originalUse.apply(this, args as any);

  if (!additiveRoutersMounted && args[0] === '/api' && typeof args[1] === 'function') {
    additiveRoutersMounted = true;
    originalUse.call(this, '/api', createAgentTrustRouter() as any);
    originalUse.call(this, '/api', createReportEntitlementRouter() as any);
  }

  return result;
};

void import('./server.ts').catch((error) => {
  console.error('[SPR] Failed to initialize hardened server entrypoint:', error);
  process.exitCode = 1;
});
