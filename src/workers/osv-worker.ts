import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, writeFile, readFile, readdir, lstat, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { Pool, PoolClient } from 'pg';

type ClaimedJob = {
  id: string;
  tenant_id: string;
  passport_id: string;
  attempt_count: number;
  max_attempts: number;
  job_type: string;
};

type SbomComponent = {
  name?: string;
  version?: string;
  ecosystem?: string;
};

const WORKER_ID = `${os.hostname()}:${process.pid}`;
const PROVIDER_TIMEOUT_MS = 15_000;

export function createWorkerPool() {
  const sslMode = process.env.SQL_SSL?.trim().toLowerCase();
  const configuredMax = Number(process.env.SPR_WORKER_DB_POOL_MAX ?? 2);
  const max = Number.isFinite(configuredMax) && configuredMax >= 1 && configuredMax <= 8 ? configuredMax : 2;
  return new Pool({
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.DATABASE_URL ? undefined : process.env.SQL_HOST,
    user: process.env.DATABASE_URL ? undefined : process.env.SQL_USER,
    password: process.env.DATABASE_URL ? undefined : process.env.SQL_PASSWORD,
    database: process.env.DATABASE_URL ? undefined : process.env.SQL_DB_NAME,
    ssl: sslMode === 'require' || sslMode === 'true'
      ? { rejectUnauthorized: true }
      : undefined,
    max,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });
}

async function claimJob(pool: Pool): Promise<ClaimedJob | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<ClaimedJob>(`
      SELECT id, tenant_id, passport_id, attempt_count, max_attempts, job_type
      FROM agent_jobs
      WHERE status = 'Pending'
        AND job_type IN ('osv_manifest_scan', 'repository_scan')
        AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
      ORDER BY created_at
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `);
    const job = result.rows[0];
    if (!job) {
      await client.query('COMMIT');
      return null;
    }
    await client.query(`
      UPDATE agent_jobs
      SET status = 'Running',
          progress = 10,
          attempt_count = attempt_count + 1,
          locked_at = NOW(),
          locked_by = $2,
          updated_at = NOW()
      WHERE id = $1
    `, [job.id, WORKER_ID]);
    await client.query('COMMIT');
    return { ...job, attempt_count: job.attempt_count + 1 };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function fetchOsv(component: Required<Pick<SbomComponent, 'name' | 'version'>> & SbomComponent) {