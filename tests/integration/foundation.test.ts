import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { buildApp } from '../../apps/api/src/app.js';
import { createVerifier } from '../../apps/api/src/auth.js';
import { assertRuntimeRole, createPool } from '../../packages/domain/src/db.js';
import { claimJob, completeJob, heartbeat } from '../../packages/domain/src/jobs.js';
import type { Me } from '../../packages/contracts/src/index.js';

// Missing environment is a failure, never an silently skipped integration gate.
const env = JSON.parse(await readFile('.local/test-env.json', 'utf8'));
const target = new URL(env.adminDatabaseUrl);
if (!['127.0.0.1','localhost'].includes(target.hostname) || target.port !== '54322') throw new Error('Teste exige banco local.');

test('real Supabase login, JWKS and immediate product revocation', async t => {
  const pool = createPool(env.databaseUrl);
  const admin = new pg.Pool({ connectionString: env.adminDatabaseUrl, max: 1 });
  t.after(async () => { await pool.end(); await admin.end(); });
  await assertRuntimeRole(pool);
  const settingsResponse = await fetch(`${env.supabaseUrl}/auth/v1/settings`, { headers: { apikey: env.publicKey } });
  assert.equal(settingsResponse.status, 200);
  const settings = await settingsResponse.json() as { disable_signup: boolean; external: { email: boolean } };
  assert.equal(settings.disable_signup, true, 'Public registration must stay disabled');
  assert.equal(settings.external.email, true, 'Existing users must be able to sign in by email');
  const auth = createClient(env.supabaseUrl, env.publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await auth.auth.signInWithPassword({ email: env.email, password: env.password });
  assert.equal(error, null); assert.ok(data.session);
  const app = await buildApp({ verify: createVerifier(env.supabaseUrl, `${env.supabaseUrl}/auth/v1`),
    findUser: async id => (await pool.query<Me>('SELECT id,email,display_name,status FROM app.users WHERE id=$1',[id])).rows[0],
    ping: async () => { await pool.query('SELECT 1'); }, logger: false,
    publicConfig: { supabaseUrl: env.supabaseUrl, supabasePublishableKey: env.publicKey } });
  t.after(() => app.close());
  const req = { url: '/v1/me', headers: { authorization: `Bearer ${data.session.access_token}` } };
  assert.equal((await app.inject(req)).statusCode, 200);
  try {
    await admin.query("UPDATE app.users SET status='suspended' WHERE id=$1", [data.user.id]);
    assert.equal((await app.inject(req)).statusCode, 403);
  } finally { await admin.query("UPDATE app.users SET status='active' WHERE id=$1", [data.user.id]); }
  await assert.rejects(() => pool.query('CREATE TABLE app.forbidden(id int)'));
  await assert.rejects(() => pool.query('UPDATE app.cash_postings SET signed_minor=1 WHERE false'));
  const grants = await admin.query(`SELECT has_schema_privilege('anon','app','USAGE') AS anon,
    has_schema_privilege('authenticated','app','USAGE') AS authenticated`);
  assert.deepEqual(grants.rows[0], { anon: false, authenticated: false });
});

test('job concurrency, expired lease, fencing and deduplication', async t => {
  const pool = createPool(env.databaseUrl, true);
  const admin = new pg.Pool({ connectionString: env.adminDatabaseUrl, max: 1 });
  t.after(async () => { await pool.end(); await admin.end(); });
  // Dedicated local test database; do not run with the application worker active.
  const unsupported = await admin.query("SELECT count(*)::int AS count FROM app.jobs WHERE kind <> 'noop'");
  assert.equal(unsupported.rows[0].count, 0, 'Use um ambiente exclusivo de testes da fundação.');
  let previous = await claimJob(pool);
  while (previous) { await completeJob(pool, previous); previous = await claimJob(pool); }
  const dedupe = randomUUID();
  await pool.query("INSERT INTO app.jobs(kind,dedupe_key) VALUES('noop',$1)", [dedupe]);
  await assert.rejects(() => pool.query("INSERT INTO app.jobs(kind,dedupe_key) VALUES('noop',$1)",[dedupe]));
  const claims = (await Promise.all(Array.from({ length: 20 }, () => claimJob(pool)))).filter(j => j !== undefined);
  assert.equal(claims.length, 1); const first = claims[0]!;
  assert.equal(await heartbeat(pool, first), true);
  await admin.query("UPDATE app.jobs SET lease_expires_at=now()-interval '1 second' WHERE id=$1",[first.id]);
  assert.equal(await heartbeat(pool, first), false);
  const second = await claimJob(pool); assert.ok(second); assert.equal(second.attempt, 2);
  assert.equal(await completeJob(pool, first), false);
  assert.equal(await completeJob(pool, second), true);
  assert.equal(await completeJob(pool, second), false);
  await pool.query("INSERT INTO app.jobs(kind,max_attempts) VALUES('noop',1)");
  const final = await claimJob(pool); assert.ok(final);
  await admin.query("UPDATE app.jobs SET lease_expires_at=now()-interval '1 second' WHERE id=$1",[final.id]);
  assert.equal(await claimJob(pool), undefined);
  assert.equal((await pool.query('SELECT status FROM app.jobs WHERE id=$1',[final.id])).rows[0].status,'failed');
  await admin.query("INSERT INTO app.jobs(kind,dedupe_key) VALUES('noop','foundation-smoke') ON CONFLICT DO NOTHING");
});
