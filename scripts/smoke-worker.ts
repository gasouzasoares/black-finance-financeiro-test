import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { createPool } from '../packages/domain/src/db.js';

const env = JSON.parse(await readFile('.local/test-env.json', 'utf8'));
const target = new URL(env.databaseUrl);
if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.port !== '54322') {
  throw new Error('Smoke test permitido somente no ambiente local.');
}
const pool = createPool(env.databaseUrl);
try {
  const { rows } = await pool.query<{ id: string }>(
    "INSERT INTO app.jobs(kind,dedupe_key) VALUES('noop',$1) RETURNING id::text", [`smoke:${randomUUID()}`]);
  const deadline = Date.now() + 60000;
  let completed = false;
  while (Date.now() < deadline) {
    const result = await pool.query('SELECT status FROM app.jobs WHERE id=$1', [rows[0]!.id]);
    if (result.rows[0]?.status === 'completed') { completed = true; break; }
    if (result.rows[0]?.status === 'failed') throw new Error('Worker marcou o job como falha.');
    await sleep(1000);
  }
  if (!completed) throw new Error('Worker não concluiu o job em 60 segundos.');
  console.log('Worker em execução concluiu um novo job noop.');
} finally { await pool.end(); }
