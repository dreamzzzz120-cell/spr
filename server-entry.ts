/**
 * Hardened production entrypoint.
 *
 * server.ts owns the existing application. This compatibility entrypoint
 * mounts the Agent Trust router without replacing Express internals.
 *
 * Express's overloaded use() signature in this dependency set types Router
 * handlers too narrowly; the cast is isolated to this compatibility boundary.
 */
import express from 'express';
import { createAgentTrustRouter } from './src/routes/agent-trust.ts';

const originalUse = express.application.use;
let agentTrustMounted = false;

express.application.use = function patchedUse(this: any, ...args: any[]) {
  const result = originalUse.apply(this, args as any);

  if (!agentTrustMounted && args[0] === '/api' && typeof args[1] === 'function') {
    agentTrustMounted = true;
    originalUse.call(this, '/api', createAgentTrustRouter() as any);
  }

  return result;
};

void import('./server.ts').catch((error) => {
  console.error('[SPR] Failed to initialize hardened server entrypoint:', error);
  process.exitCode = 1;
});
