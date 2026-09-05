import crypto from 'node:crypto';
import { normalizePsaDisposition, nextFindingStatus, type FindingStatus } from './vulnerability-trust.ts';

export interface PsaWebhookEnvelope {
  eventId: string;
  eventType: string;
  ticketId: string;
  status: string;
  disposition?: string | null;
  occurredAt: string;
  payload: Record<string, unknown>;
}

export function verifyPsaSignature(rawBody: string, signature: string, secret: string, timestamp: string, maxAgeSeconds = 300): boolean {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > maxAgeSeconds) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex');
  const provided = signature.replace(/^v1=/, '');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function applyPsaDisposition(current: FindingStatus, status: string, disposition?: string | null): FindingStatus | null {
  const requested = normalizePsaDisposition(status, disposition);
  if (!requested) return null;
  // A subsequent "resolved"/closed claim must trigger verification when the
  // finding is already in a remediation-claimed state; never silently accept it.
  const raw = `${status}|${disposition ?? ''}`.toLowerCase();
  if (current === 'REMEDIATION_CLAIMED' && (raw.includes('resolved') || raw.includes('closed') || raw.includes('done'))) {
    throw new Error('FINDING_VERIFICATION_REQUIRED');
  }
  return nextFindingStatus(current, requested, 'PSA');
}

export function eventIdempotencyKey(tenantId: string, provider: string, eventId: string): string {
  return crypto.createHash('sha256').update(`${tenantId}|${provider}|${eventId}`, 'utf8').digest('hex');
}
