import pg from 'pg';
// Civil dates must not be shifted through the host timezone or serialized as instants.
pg.types.setTypeParser(1082, (value:string) => value);

export function createPool(connectionString: string, worker = false, maxConnections?:number, connectionTimeoutMillis=5000) {
  const parsed = new URL(connectionString);
  if(parsed.searchParams.has('sslmode'))parsed.searchParams.set('sslmode','verify-full');
  if (decodeURIComponent(parsed.username).split('.')[0] !== 'app_runtime') {
    throw new Error('Runtime exige conexão com o papel app_runtime.');
  }
  return new pg.Pool({
    connectionString:parsed.href, max: maxConnections??(worker ? 4 : 10),
    connectionTimeoutMillis, idleTimeoutMillis: 30000,
    statement_timeout: worker ? 30000 : 2000, lock_timeout: 500,
    application_name: worker ? 'finance-worker' : 'finance-api',
  });
}

export async function assertRuntimeRole(pool: pg.Pool) {
  const { rows } = await pool.query<{ ok: boolean }>(
    `SELECT current_user = 'app_runtime' AND NOT rolsuper AND NOT rolcreatedb
      AND NOT rolcreaterole AND NOT rolbypassrls AS ok
     FROM pg_roles WHERE rolname = current_user`);
  if (!rows[0]?.ok) throw new Error('Papel de runtime inválido.');
}
