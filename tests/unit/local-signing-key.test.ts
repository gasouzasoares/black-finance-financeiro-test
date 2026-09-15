import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalSigningKey, normalizeLocalSigningKeys } from '../../scripts/local-signing-key.js';

test('local Auth key explicitly permits signing and upgrades without rotating key material', async () => {
  const key = await createLocalSigningKey();
  assert.deepEqual(key.key_ops, ['sign']);
  const oldFormat = { ...key }; delete oldFormat.key_ops;
  const normalized = normalizeLocalSigningKeys([oldFormat])[0]!;
  assert.equal(normalized.kid, key.kid);
  assert.equal(normalized.d, key.d);
  assert.deepEqual(normalized.key_ops, ['sign']);
  assert.throws(() => normalizeLocalSigningKeys([{ ...key, key_ops: ['verify'] }]));
});
