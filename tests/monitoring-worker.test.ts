import { describe, expect, it, vi } from 'vitest';
import {
  LEASE_SECONDS, claimCollectorJob, heartbeatCollectorJob, recoverExpiredLeases,
  recordCollectorFailure, scheduleDueConfigurations,
} from '../src/workers/monitoring-worker.ts';

function transactionClient(rows: any[] = []) {
  const query = vi.fn()
    .mockResolvedValueOnce({}) // BEGIN
    .mockResolvedValueOnce({ rows, rowCount: rows.length });
  return { query };
}

describe('durable monitoring scheduler', () => {
  it('locks due rows and creates jobs with conflict-safe idempotency', async () => {
    const client = transactionClient([{
      id: 'm1', tenant_id: 't1', client_id: 'c1', asset_id: 'a1', passport_id: 'p1',
      collector_id: 'uptime', subject_type: 'url', subject_identifier: 'https://example.com',
      schedule_seconds: 900, next_scheduled_at: '2026-01-01T00:00:00Z',
    }]);
    client.query
      .mockResolvedValueOnce({ rows: [{ id: 'job-1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({}); // COMMIT
    const result = await scheduleDueConfigurations(client as any, new Date('2026-01-01T00:30:00Z'));
    expect(result).toEqual({ due: 1, created: 1 });
    expect(client.query.mock.calls[1][0]).toContain('FOR UPDATE SKIP LOCKED');
    expect(client.query.mock.calls[2][0]).toContain('ON CONFLICT (idempotency_key) DO NOTHING');
  });

  it('does not create a job when no configuration is due', async () => {
    const client = transactionClient([]);
    client.query.mockResolvedValueOnce({});
    expect(await scheduleDueConfigurations(client as any)).toEqual({ due: 0, created: 0 });
  });
});

describe('collector worker leases', () => {
  it('claims atomically using skip locked and a bounded lease', async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ id: 'j1', attempt_number: 1 }] })
        .mockResolvedValueOnce({}),
      release: vi.fn(),
    };
    const pool = { connect: vi.fn().mockResolvedValue(client) };
    expect((await claimCollectorJob(pool as any, 'worker-a'))?.id).toBe('j1');
    expect(client.query.mock.calls[1][0]).toContain('FOR UPDATE SKIP LOCKED');
    expect(client.query.mock.calls[1][1][2]).toBe(LEASE_SECONDS);
    expect(client.release).toHaveBeenCalled();
  });

  it('heartbeats only a job owned by the worker', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [{ id: 'j1', lease_expires_at: 'later' }] }) };
    await heartbeatCollectorJob(pool as any, 'j1', 'worker-a');
    expect(pool.query.mock.calls[0][0]).toContain("state IN ('claimed','running')");
    expect(pool.query.mock.calls[0][0]).toContain('lease_owner = $2');
  });

  it('rejects a heartbeat after lease ownership is lost', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    await expect(heartbeatCollectorJob(pool as any, 'j1', 'worker-b')).rejects.toThrow('JOB_LEASE_LOST');
  });

  it('recovers expired leases and dead-letters exhausted jobs', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [{ id: 'j1', state: 'dead_lettered' }] }) };
    const rows = await recoverExpiredLeases(pool as any);
    expect(rows[0].state).toBe('dead_lettered');
    expect(pool.query.mock.calls[0][0]).toContain("attempt_number >= maximum_attempts");
  });

  it('uses a safe failure and bounded retry state', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [{ id: 'j1', state: 'dead_lettered' }] }) };
    const job = { id: 'j1', attempt_number: 3, maximum_attempts: 3 } as any;
    expect((await recordCollectorFailure(pool as any, job, 'worker-a', 'TIMEOUT', 'Timed out')).state)
      .toBe('dead_lettered');
    expect(pool.query.mock.calls[0][0]).not.toContain('stack');
  });
});
