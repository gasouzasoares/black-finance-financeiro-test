import { buildApp } from './app.js';
import { readConfig } from './config.js';
import { createVerifier } from './auth.js';
import { assertRuntimeRole, createPool } from '../../../packages/domain/src/db.js';
import type { Me } from '../../../packages/contracts/src/index.js';
import {Finance} from '../../../packages/domain/src/finance.js';

const config = readConfig();
const pool = createPool(config.DATABASE_URL);
pool.on('error', () => console.error('DATABASE_POOL_ERROR'));
await assertRuntimeRole(pool);
const app = await buildApp({
  finance:new Finance(pool),
  verify: createVerifier(config.SUPABASE_URL, config.JWT_ISSUER),
  findUser: async id => (await pool.query<Me>(
    'SELECT id, email, display_name, status FROM app.users WHERE id = $1', [id])).rows[0],
  ping: async () => { await pool.query('SELECT 1'); },
  publicConfig: { supabaseUrl: config.SUPABASE_PUBLIC_URL, supabasePublishableKey: config.SUPABASE_PUBLISHABLE_KEY },
});
app.addHook('onClose', async () => { await pool.end(); });
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => { void app.close(); });
await app.listen({ host: '0.0.0.0', port: config.PORT });
