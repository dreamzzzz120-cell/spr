/**
 * Hardened production entrypoint.
 *
 * server.ts owns the existing application. This entrypoint only inserts the
 * AI Agent Trust router immediately after the global /api rate limiter and
 * before the existing authenticated monitoring router. That keeps the new
 * feature isolated without rewriting the existing application server.
 */
import express from 'express';
import { createAgentTrustRouter } from './src/routes/agent-trust.ts';

const originalUse = express.application.use;
let agentTrustMounted = false;

express.application.use = function patchedUse(this: any, ...args: any[]) {
  const result = originalUse.apply(this, args as any);

  // server.ts first mounts the global /api rate limiter, then the existing
  // monitoring router. Insert Agent Trust between those two layers.
  if (!agentTrustMounted && args[0] === '/api' && typeof args[1] === 'function') {
    agentTrustMounted = true;
    originalUse.call(this, '/api', createAgentTrustRouter());
  }

  return result;
};

await import('./server.ts');
