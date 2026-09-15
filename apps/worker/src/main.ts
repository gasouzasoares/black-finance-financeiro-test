import { writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { assertRuntimeRole, createPool } from '../../../packages/domain/src/db.js';
import { claimJob, completeJob, failJob, heartbeat } from '../../../packages/domain/src/jobs.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL obrigatória.');
const pool = createPool(process.env.DATABASE_URL, true);
pool.on('error', () => console.error('DATABASE_POOL_ERROR'));
await assertRuntimeRole(pool);
let stopping = false;
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => { stopping = true; });
let idleMs = 500;
while (!stopping) {
  try {
    const job = await claimJob(pool);
    await writeFile('/tmp/worker-heartbeat', String(Date.now()));
    if (!job) { await sleep(idleMs); idleMs = Math.min(5000, idleMs * 1.5); continue; }
    idleMs = 500;
    let leaseLost = false;
    const timer = setInterval(() => {
      void heartbeat(pool, job).then(ok => { if (!ok) leaseLost = true; }).catch(() => { leaseLost = true; });
    }, 15000);
    try {
      if (job.kind !== 'noop') throw new Error('UNSUPPORTED_JOB');
      // Foundation handler; financial and external side effects are not enabled.
      if (!leaseLost) await completeJob(pool, job);
    } catch { await failJob(pool, job, 'HANDLER_FAILED'); }
    finally { clearInterval(timer); }
  } catch { console.error(JSON.stringify({ code: 'WORKER_POLL_FAILED' })); await sleep(5000); }
}
await pool.end();
