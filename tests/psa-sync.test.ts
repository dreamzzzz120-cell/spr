import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import { applyPsaDisposition, derivePsaWebhookSecret, eventIdempotencyKey, verifyPsaSignature } from '../src/lib/psa-sync';

describe('SPR PSA synchronization', () => {
  it('verifies signed, fresh webhook payloads', () => {
    const secret = 'test-secret';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({ id: 'evt-1' });
    const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
    expect(verifyPsaSignature(body, `v1=${signature}`, secret, timestamp)).toBe(true);
    expect(verifyPsaSignature(body, 'v1=bad', secret, timestamp)).toBe(false);
  });

  it('derives isolated secrets per tenant and provider', () => {
    const root = 'root-secret-never-shared-with-providers';
    const a = derivePsaWebhookSecret(root, 'tenant-a', 'autotask');
    expect(a).toBe(derivePsaWebhookSecret(root, 'tenant-a', 'autotask'));
    expect(a).not.toBe(derivePsaWebhookSecret(root, 'tenant-b', 'autotask'));
    expect(a).not.toBe(derivePsaWebhookSecret(root, 'tenant-a', 'connectwise'));
    expect(a).not.toBe(root);
  });

  it('rejects a signature created with another tenant/provider credential', () => {
    const root = 'root-secret-never-shared-with-providers';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({ tenantId: 'tenant-a', eventId: 'evt-1' });
    const correct = derivePsaWebhookSecret(root, 'tenant-a', 'autotask');
    const wrong = derivePsaWebhookSecret(root, 'tenant-b', 'autotask');
    const signature = crypto.createHmac('sha256', wrong).update(`${timestamp}.${body}`).digest('hex');
    expect(verifyPsaSignature(body, signature, correct, timestamp)).toBe(false);
  });

  it('rejects replayed/stale webhook timestamps', () => {
    const old = (Math.floor(Date.now() / 1000) - 301).toString();
    const body = '{}';
    const signature = crypto.createHmac('sha256', 'secret').update(`${old}.${body}`).digest('hex');
    expect(verifyPsaSignature(body, signature, 'secret', old)).toBe(false);
  });

  it('imports technician false-positive decisions as claims, never verified truth', () => {
    expect(applyPsaDisposition('OPEN', 'Closed', 'False Positive')).toBe('CLAIMED_FALSE_POSITIVE');
    expect(() => applyPsaDisposition('REMEDIATION_CLAIMED', 'Closed', 'Resolved')).toThrow('FINDING_VERIFICATION_REQUIRED');
  });

  it('creates deterministic event idempotency keys', () => {
    expect(eventIdempotencyKey('t1', 'autotask', 'evt-1')).toBe(eventIdempotencyKey('t1', 'autotask', 'evt-1'));
    expect(eventIdempotencyKey('t1', 'autotask', 'evt-1')).not.toBe(eventIdempotencyKey('t2', 'autotask', 'evt-1'));
  });
});
