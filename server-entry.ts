/**
 * Hardened production entrypoint.
 *
 * server.ts owns the existing application. This compatibility entrypoint
 * mounts the Agent Trust, Founder, and PSA trust-sync routers without replacing
 * the existing Express application. It also captures the exact JSON bytes used
 * for PSA HMAC verification before Express parses the body.
 */
import express from 'express';
import { createAgentTrustRouter } from './src/routes/agent-trust.ts';
import { createFounderRouter } from './src/routes/founder.ts';
import { createPsaRouter } from './src/routes/psa.ts';

const originalUse = express.application.use;
const originalJson = (express as any).json;
let agentTrustMounted = false;
let founderMounted = false;
let psaMounted = false;

// Preserve the exact request bytes for signed external webhooks. Existing
// callers' verify hooks still run unchanged.
(express as any).json = function hardenedJsonParser(options: any = {}) {
  const callerVerify = options.verify;
  return originalJson({
    ...options,
    verify(req: any, res: any, buf: Buffer, encoding: string) {
      const bufferEncoding = encoding as BufferEncoding;
      req.rawBody = buf.toString(bufferEncoding || 'utf8');
      if (typeof callerVerify === 'function') callerVerify(req, res, buf, encoding);
    },
  });
};

express.application.use = function patchedUse(this: any, ...args: any[]) {
  const result = originalUse.apply(this, args as any);

  if (args[0] === '/api' && typeof args[1] === 'function') {
    if (!agentTrustMounted) {
      agentTrustMounted = true;
      originalUse.call(this, '/api', createAgentTrustRouter() as any);
    }
    if (!founderMounted) {
      founderMounted = true;
      originalUse.call(this, '/api/founder', createFounderRouter() as any);
    }
    if (!psaMounted) {
      psaMounted = true;
      originalUse.call(this, '/api/psa', createPsaRouter() as any);
    }
  }

  return result;
};

void import('./server.ts').catch((error) => {
  console.error('[SPR] Failed to initialize hardened server entrypoint:', error);
  process.exitCode = 1;
});