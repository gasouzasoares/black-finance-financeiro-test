import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp, type Dependencies } from '../../apps/api/src/app.js';
import { createPool } from '../../packages/domain/src/db.js';
const id = '10000000-0000-4000-8000-000000000001';
const user = { id, email: 'test@example.com', display_name: 'Teste', status: 'active' };
function dependencies(overrides: Partial<Dependencies> = {}): Dependencies {
  return { verify: async () => id, findUser: async () => user, ping: async () => {},
    publicConfig: { supabaseUrl: 'http://localhost:54321', supabasePublishableKey: 'public-test' },
    logger: false, ...overrides };
}
test('health, public config and authenticated identity', async t => {
  const app = await buildApp(dependencies()); t.after(() => app.close());
  assert.equal((await app.inject('/health')).statusCode, 200);
  assert.equal((await app.inject('/v1/config')).json().supabasePublishableKey, 'public-test');
  const result = await app.inject({ url: '/v1/me', headers: { authorization: 'Bearer valid' } });
  assert.equal(result.statusCode, 200); assert.deepEqual(result.json(), user);
  assert.ok(result.headers['x-request-id']); assert.equal(result.headers['cache-control'], 'no-store');
});
test('missing, invalid and empty identity fail closed', async t => {
  const app = await buildApp(dependencies({ verify: async () => { throw new Error('private verifier detail'); } }));
  const empty = await buildApp(dependencies({ findUser: async () => undefined }));
  t.after(() => app.close()); t.after(() => empty.close());
  assert.equal((await app.inject('/v1/me')).statusCode, 401);
  const invalid = await app.inject({ url: '/v1/me', headers: { authorization: 'Bearer invalid' } });
  assert.equal(invalid.statusCode, 401); assert.ok(!invalid.body.includes('private verifier detail'));
  assert.equal((await empty.inject({ url: '/v1/me', headers: { authorization: 'Bearer valid' } })).statusCode, 403);
});
test('revocation is effective on the next request', async t => {
  let status = 'active';
  const app = await buildApp(dependencies({ findUser: async () => ({ ...user, status }) })); t.after(() => app.close());
  const request = { url: '/v1/me', headers: { authorization: 'Bearer valid' } };
  assert.equal((await app.inject(request)).statusCode, 200);
  status = 'suspended'; assert.equal((await app.inject(request)).statusCode, 403);
});
test('health readiness and error envelope do not leak database errors', async t => {
  const app = await buildApp(dependencies({ ping: async () => { throw new Error('database secret'); } })); t.after(() => app.close());
  const result = await app.inject('/health'); assert.equal(result.statusCode, 503);
  assert.ok(!result.body.includes('database secret')); assert.ok(result.json().request_id);
  assert.equal((await app.inject('/missing')).statusCode, 404);
});
test('rate limit is enforced and normalized', async t => {
  const app = await buildApp(dependencies()); t.after(() => app.close());
  for (let n = 0; n < 120; n++) await app.inject('/v1/config');
  const result = await app.inject('/v1/config');
  assert.equal(result.statusCode, 429); assert.equal(result.json().code, 'RATE_LIMITED');
});
test('runtime refuses privileged database accounts', () => {
  assert.throws(() => createPool('postgresql://postgres:unused@localhost/postgres'), /app_runtime/);
});
