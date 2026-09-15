import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { createVerifier } from '../../apps/api/src/auth.js';

test('JWKS verifies signature, issuer, audience and expiration', async t => {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const { privateKey: alien } = await generateKeyPair('ES256');
  const jwk = { ...await exportJWK(publicKey), alg: 'ES256', kid: 'test-key', use: 'sig' };
  const server = createServer((_req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ keys: [jwk] })); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>((resolve, reject) => { server.close(e => e ? reject(e) : resolve()); server.closeAllConnections(); }));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}`;
  const verify = createVerifier(url, `${url}/auth/v1`);
  async function sign(issuer = `${url}/auth/v1`, audience = 'authenticated', expiry = '1h', key = privateKey) {
    return new SignJWT({ role: 'authenticated' }).setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
      .setSubject('10000000-0000-4000-8000-000000000001').setIssuedAt().setIssuer(issuer).setAudience(audience).setExpirationTime(expiry).sign(key);
  }
  assert.equal(await verify(await sign()), '10000000-0000-4000-8000-000000000001');
  await assert.rejects(() => sign('https://other.example').then(verify));
  await assert.rejects(() => sign(undefined, 'other').then(verify));
  await assert.rejects(() => sign(undefined, undefined, '-1h').then(verify));
  await assert.rejects(() => sign(undefined, undefined, '1h', alien).then(verify));
});
