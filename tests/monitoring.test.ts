import { describe, expect, it, vi } from 'vitest';
import {
  COLLECTORS, FRESHNESS_POLICIES, advanceSchedule, assertPublicNetworkTarget,
  collectorJobKey, confidenceAt, failureResult, freshnessAt, isBlockedIp,
  nextFailureState,
} from '../src/utils/monitoring.ts';

describe('monitoring collector contract', () => {
  it('registers only the six supported collectors with versioned policies', () => {
    expect(Object.keys(COLLECTORS)).toEqual([
      'repository', 'dependency', 'tls', 'domain_dns', 'uptime', 'release',
    ]);
    for (const collector of Object.values(COLLECTORS)) {
      expect(collector.version).toMatch(/^spr\./);
      expect(collector.minimumScheduleSeconds).toBeGreaterThanOrEqual(900);
      expect(collector.timeoutSeconds).toBeGreaterThan(0);
      expect(collector.maximumRetries).toBeGreaterThan(0);
    }
  });

  it('builds deterministic, scope-sensitive job keys', () => {
    const input = {
      tenantId: 'tenant-a', assetId: 'asset-a', collectorId: 'repository',
      subjectIdentifier: 'owner/repo', monitoredVersion: 'abc123',
      observationWindow: '42', collectorVersion: 'spr.repository.v1',
    };
    expect(collectorJobKey(input)).toBe(collectorJobKey(input));
    expect(collectorJobKey({ ...input, tenantId: 'tenant-b' })).not.toBe(collectorJobKey(input));
    expect(collectorJobKey({ ...input, monitoredVersion: 'def456' })).not.toBe(collectorJobKey(input));
  });

  it('recovers missed schedules without scheduling in the past', () => {
    const due = new Date('2026-01-01T00:00:00Z');
    const now = new Date('2026-01-01T03:10:00Z');
    expect(advanceSchedule(due, now, 3600).toISOString()).toBe('2026-01-01T04:00:00.000Z');
  });

  it('bounds retries and dead-letters the final failure', () => {
    expect(nextFailureState(1, 3)).toBe('failed');
    expect(nextFailureState(3, 3)).toBe('dead_lettered');
  });

  it('maps timeout and failure to unavailable with a null score', () => {
    const result = failureResult({ status: 'timed_out', safeErrorCode: 'COLLECTOR_TIMEOUT' });
    expect(result).toMatchObject({ status: 'timed_out', state: 'unavailable', score: null });
    expect(result.safeErrorMessage).toContain('does not treat this result as a pass or failure');
  });
});

describe('freshness and confidence policies', () => {
  const policy = FRESHNESS_POLICIES['network.v1'];
  const now = new Date('2026-01-02T00:00:00Z');
  const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000).toISOString();

  it('transitions fresh to aging to stale to expired', () => {
    expect(freshnessAt(ago(100), now, policy)).toBe('fresh');
    expect(freshnessAt(ago(4_000), now, policy)).toBe('aging');
    expect(freshnessAt(ago(8_000), now, policy)).toBe('stale');
    expect(freshnessAt(ago(22_000), now, policy)).toBe('expired');
    expect(freshnessAt(null, now, policy)).toBe('unknown');
  });

  it('expiry invalidates score eligibility', () => {
    expect(confidenceAt(ago(100), now).scoreEligible).toBe(true);
    expect(confidenceAt(ago(300_000), now)).toEqual({ confidence: 0, scoreEligible: false });
  });
});

describe('network collector SSRF policy', () => {
  it.each([
    '127.0.0.1', '10.0.0.1', '169.254.169.254', '172.16.1.1', '192.168.1.1',
    '::1', 'fc00::1', 'fd00::1', 'fe80::1', 'ff02::1',
  ])('blocks non-public address %s', address => {
    expect(isBlockedIp(address)).toBe(true);
  });

  it('blocks unsupported schemes, credentials, and internal hostnames', async () => {
    await expect(assertPublicNetworkTarget('file:///etc/passwd')).rejects.toThrow('TARGET_PROTOCOL_BLOCKED');
    await expect(assertPublicNetworkTarget('https://user:secret@example.com')).rejects.toThrow('TARGET_CREDENTIALS_BLOCKED');
    await expect(assertPublicNetworkTarget('http://metadata.google.internal')).rejects.toThrow('TARGET_HOST_BLOCKED');
  });

  it('blocks when any DNS answer is private to prevent mixed-answer rebinding', async () => {
    const resolver = vi.fn().mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]);
    await expect(assertPublicNetworkTarget('https://example.com', resolver)).rejects.toThrow('TARGET_NETWORK_BLOCKED');
  });

  it('accepts a target only when every resolved address is public', async () => {
    const resolver = vi.fn().mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    const target = await assertPublicNetworkTarget('https://example.com/path', resolver);
    expect(target.addresses).toEqual(['93.184.216.34']);
  });
});
