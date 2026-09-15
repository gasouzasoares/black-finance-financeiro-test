import { randomUUID } from 'node:crypto';
import type pg from 'pg';

export type Job = { id: string; kind: string; payload: unknown; attempt: number; lease_token: string };
export const leaseSeconds = 60;

export async function claimJob(pool: pg.Pool): Promise<Job | undefined> {
  // Expired final attempts are terminal; they must not stay running forever.
  await pool.query(`UPDATE app.jobs SET status = 'failed', lease_token = NULL,
    lease_expires_at = NULL, updated_at = clock_timestamp(), last_error_code = 'LEASE_EXPIRED'
    WHERE status = 'running' AND lease_expires_at < clock_timestamp() AND attempt >= max_attempts`);
  const { rows } = await pool.query<Job>(`
    WITH candidate AS (
      SELECT id FROM app.jobs
      WHERE attempt < max_attempts AND
        ((status = 'queued' AND available_at <= clock_timestamp()) OR
         (status = 'running' AND lease_expires_at < clock_timestamp()))
      ORDER BY available_at, id FOR UPDATE SKIP LOCKED LIMIT 1
    )
    UPDATE app.jobs j SET status = 'running', attempt = attempt + 1,
      lease_token = $1, lease_expires_at = clock_timestamp() + $2 * interval '1 second',
      updated_at = clock_timestamp()
    FROM candidate c WHERE j.id = c.id
    RETURNING j.id::text, j.kind, j.payload, j.attempt, j.lease_token`, [randomUUID(), leaseSeconds]);
  return rows[0];
}

export async function heartbeat(pool: pg.Pool, job: Job): Promise<boolean> {
  const result = await pool.query(`UPDATE app.jobs SET
    lease_expires_at = clock_timestamp() + $3 * interval '1 second', updated_at = clock_timestamp()
    WHERE id = $1 AND lease_token = $2 AND status = 'running'
    AND lease_expires_at > clock_timestamp()`, [job.id, job.lease_token, leaseSeconds]);
  return result.rowCount === 1;
}

export async function completeJob(pool: pg.Pool, job: Job): Promise<boolean> {
  const result = await pool.query(`UPDATE app.jobs SET status = 'completed',
    lease_token = NULL, lease_expires_at = NULL, completed_at = clock_timestamp(),
    updated_at = clock_timestamp(), last_error_code = NULL
    WHERE id = $1 AND lease_token = $2 AND status = 'running'
    AND lease_expires_at > clock_timestamp()`, [job.id, job.lease_token]);
  return result.rowCount === 1;
}

export async function failJob(pool: pg.Pool, job: Job, code: string): Promise<boolean> {
  const delay = Math.min(300, 2 ** job.attempt) + Math.floor(Math.random() * 5);
  const result = await pool.query(`UPDATE app.jobs SET
    status = CASE WHEN attempt >= max_attempts THEN 'failed' ELSE 'queued' END,
    available_at = clock_timestamp() + $3 * interval '1 second',
    lease_token = NULL, lease_expires_at = NULL, last_error_code = $4, updated_at = clock_timestamp()
    WHERE id = $1 AND lease_token = $2 AND status = 'running'
    AND lease_expires_at > clock_timestamp()`, [job.id, job.lease_token, delay, code]);
  return result.rowCount === 1;
}
