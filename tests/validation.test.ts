/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  createClientSchema,
  createPassportSchema,
  updatePassportSchema,
  evidenceItemSchema,
  createScanSchema,
  userOnboardSchema,
  orgInviteSchema,
  billingCheckoutSchema,
  createAgentJobSchema
} from '../src/middleware/validation.ts';

describe('createClientSchema', () => {
  it('accepts a well-formed client', () => {
    const result = createClientSchema.safeParse({ name: 'Acme Corp', domain: 'acme.example' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty name', () => {
    const result = createClientSchema.safeParse({ name: '', domain: 'acme.example' });
    expect(result.success).toBe(false);
  });

  it('rejects a client missing domain', () => {
    const result = createClientSchema.safeParse({ name: 'Acme Corp' });
    expect(result.success).toBe(false);
  });
});

describe('createPassportSchema', () => {
  it('accepts a well-formed passport', () => {
    const result = createPassportSchema.safeParse({
      name: 'nginx',
      version: '1.27.0',
      publisher: 'F5 Inc.'
    });
    expect(result.success).toBe(true);
  });

  it('rejects client-supplied fileHash on passport creation', () => {
    const result = createPassportSchema.safeParse({
      name: 'nginx',
      version: '1.27.0',
      publisher: 'F5 Inc.',
      fileHash: 'deadbeef'.repeat(8)
    });
    expect(result.success).toBe(true);
    expect((result.data as any).fileHash).toBeUndefined();
  });

  it('rejects a passport missing required fields', () => {
    const result = createPassportSchema.safeParse({ name: 'nginx' });
    expect(result.success).toBe(false);
  });
});

describe('userOnboardSchema / orgInviteSchema', () => {
  it('rejects onboarding with a missing companyName', () => {
    const result = userOnboardSchema.safeParse({ role: 'Owner' });
    expect(result.success).toBe(false);
  });

  it('accepts a well-formed onboarding payload', () => {
    const result = userOnboardSchema.safeParse({ companyName: 'Acme MSP', role: 'Owner' });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed email on invite', () => {
    const result = orgInviteSchema.safeParse({ email: 'not-an-email', role: 'Viewer' });
    expect(result.success).toBe(false);
  });

  it('accepts a well-formed invite', () => {
    const result = orgInviteSchema.safeParse({ email: 'person@example.com', role: 'Viewer' });
    expect(result.success).toBe(true);
  });
});

describe('createScanSchema', () => {
  it('rejects an empty targetName', () => {
    const result = createScanSchema.safeParse({ targetName: '' });
    expect(result.success).toBe(false);
  });
});

describe('billingCheckoutSchema / createAgentJobSchema', () => {
  it('billingCheckoutSchema rejects an empty payload (billingId is required)', () => {
    expect(billingCheckoutSchema.safeParse({}).success).toBe(false);
  });

  it('billingCheckoutSchema accepts a billingId', () => {
    expect(billingCheckoutSchema.safeParse({ billingId: 'bill-123' }).success).toBe(true);
  });

  it('createAgentJobSchema rejects a payload missing agentId/passportId', () => {
    expect(createAgentJobSchema.safeParse({}).success).toBe(false);
  });

  it('createAgentJobSchema accepts a well-formed job', () => {
    expect(createAgentJobSchema.safeParse({ agentId: 'agent-1', passportId: 'passport-1' }).success).toBe(true);
  });
});

// --- Evidence status lockdown (the core of this hardening pass) ---
describe('evidenceItemSchema — controlled vocabulary', () => {
  const baseItem = {
    id: 'ev-1',
    name: 'Developer Binary Signature',
    type: 'Signature' as const,
    timestamp: new Date().toISOString()
  };

  it('accepts DECLARED status with no evidence record required', () => {
    const result = evidenceItemSchema.safeParse({ ...baseItem, status: 'DECLARED' });
    expect(result.success).toBe(true);
  });

  it('accepts OBSERVED and CONFIGURED with no extra fields', () => {
    expect(evidenceItemSchema.safeParse({ ...baseItem, status: 'OBSERVED' }).success).toBe(true);
    expect(evidenceItemSchema.safeParse({ ...baseItem, status: 'CONFIGURED' }).success).toBe(true);
  });

  it('rejects a bare VERIFIED claim with no checksum, chain of custody, verifier, or verifiedAt', () => {
    const result = evidenceItemSchema.safeParse({ ...baseItem, status: 'VERIFIED' });
    expect(result.success).toBe(false);
  });

  it('rejects VERIFIED with only a checksum and nothing else', () => {
    const result = evidenceItemSchema.safeParse({
      ...baseItem,
      status: 'VERIFIED',
      checksum: 'sha256:deadbeef'
    });
    expect(result.success).toBe(false);
  });

  it('rejects VERIFIED with an empty chainOfCustody array', () => {
    const result = evidenceItemSchema.safeParse({
      ...baseItem,
      status: 'VERIFIED',
      checksum: 'sha256:deadbeef',
      chainOfCustody: [],
      verifierEngineId: 'engine-1',
      verifiedAt: new Date().toISOString()
    });
    expect(result.success).toBe(false);
  });

  it('accepts VERIFIED only when checksum + chainOfCustody + verifierEngineId + verifiedAt are all present', () => {
    const result = evidenceItemSchema.safeParse({
      ...baseItem,
      status: 'VERIFIED',
      checksum: 'sha256:deadbeef',
      chainOfCustody: [{ step: 'collected', actor: 'scan-engine-1', timestamp: new Date().toISOString() }],
      verifierEngineId: 'scan-engine-1',
      verifiedAt: new Date().toISOString()
    });
    expect(result.success).toBe(true);
  });

  it('applies the same requirement to PARTIALLY_VERIFIED', () => {
    const bare = evidenceItemSchema.safeParse({ ...baseItem, status: 'PARTIALLY_VERIFIED' });
    expect(bare.success).toBe(false);

    const complete = evidenceItemSchema.safeParse({
      ...baseItem,
      status: 'PARTIALLY_VERIFIED',
      checksum: 'sha256:deadbeef',
      chainOfCustody: [{ step: 'collected', actor: 'scan-engine-1', timestamp: new Date().toISOString() }],
      verifierEngineId: 'scan-engine-1',
      verifiedAt: new Date().toISOString()
    });
    expect(complete.success).toBe(true);
  });

  it('rejects FAILED status without a failureReason', () => {
    const result = evidenceItemSchema.safeParse({ ...baseItem, status: 'FAILED' });
    expect(result.success).toBe(false);
  });

  it('accepts FAILED status with a failureReason', () => {
    const result = evidenceItemSchema.safeParse({
      ...baseItem,
      status: 'FAILED',
      failureReason: 'Signature did not match the published public key'
    });
    expect(result.success).toBe(true);
  });

  it('rejects a status value outside the controlled vocabulary', () => {
    const result = evidenceItemSchema.safeParse({ ...baseItem, status: 'Verified' }); // legacy casing, no longer valid
    expect(result.success).toBe(false);
  });
});

describe('updatePassportSchema — evidence array is strictly validated, not passed through', () => {
  it('accepts an update with no evidence field at all', () => {
    const result = updatePassportSchema.safeParse({ name: 'nginx' });
    expect(result.success).toBe(true);
  });

  it('accepts an update whose evidence items are all DECLARED', () => {
    const result = updatePassportSchema.safeParse({
      evidence: [
        {
          id: 'ev-1',
          name: 'SOC 2 report',
          type: 'Audit Report',
          status: 'DECLARED',
          timestamp: new Date().toISOString()
        }
      ]
    });
    expect(result.success).toBe(true);
  });

  it('rejects an update where a client tries to self-report a bare VERIFIED evidence item', () => {
    const result = updatePassportSchema.safeParse({
      evidence: [
        {
          id: 'ev-1',
          name: 'SOC 2 report',
          type: 'Audit Report',
          status: 'VERIFIED',
          timestamp: new Date().toISOString()
          // no checksum / chainOfCustody / verifierEngineId / verifiedAt — this is exactly
          // the fabricated-evidence hole this schema exists to close.
        }
      ]
    });
    expect(result.success).toBe(false);
  });

  it('still allows unrelated unknown fields through (passthrough) alongside strict evidence validation', () => {
    const result = updatePassportSchema.safeParse({
      name: 'nginx',
      someFutureFieldNotYetModeled: 'ok'
    });
    expect(result.success).toBe(true);
  });
});
