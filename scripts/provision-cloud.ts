import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomBytes,createHash} from 'node:crypto';
import pg from 'pg';
import {makeAuth} from '../apps/api/src/cloud-auth.js';
// This script operates exclusively on the dedicated test project recorded below.
const project=JSON.parse(await readFile('.vercel/project.json','utf8'));
if(project.projectName!=='black-finance-financeiro-test')throw new Error('Projeto de teste incorreto.');
const env=parseEnv(await readFile('.local/vercel.env','utf8'));
const connection=env.DATABASE_URL_UNPOOLED??env.POSTGRES_URL_NON_POOLING??env.DATABASE_URL;
if(!connection||!new URL(connection).hostname.endsWith('.neon.tech'))throw new Error('Banco Neon de teste ausente.');
const admin=new pg.Pool({connectionString:connection,max:1});
let secrets:{password:string;runtimePassword:string;authSecret:string;email:string};
try{secrets=JSON.parse(await readFile('.local/cloud-credentials.json','utf8'));}catch{secrets={password:randomBytes(24).toString('base64url'),runtimePassword:randomBytes(32).toString('hex'),authSecret:randomBytes(48).toString('base64url'),email:'admin@finance.local'};await writeFile('.local/cloud-credentials.json',JSON.stringify(secrets,null,2));}
const url='https://black-finance-financeiro-test.vercel.app';
try{
 const auth=makeAuth(admin,secrets.authSecret,url,true);
 const {getMigrations}=await import('better-auth/db/migration');
 const migrations=await getMigrations(auth.options);await migrations.runMigrations();
 await admin.query(`CREATE SCHEMA IF NOT EXISTS app; CREATE TABLE IF NOT EXISTS app.schema_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now());`);
 const base=`DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='app_runtime') THEN CREATE ROLE app_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS; END IF; END $$;
 GRANT USAGE ON SCHEMA app,public TO app_runtime;
 REVOKE CREATE ON SCHEMA public FROM PUBLIC,app_runtime;
 CREATE TABLE app.users(id uuid PRIMARY KEY REFERENCES public.auth_user(id),email text NOT NULL UNIQUE,display_name text NOT NULL,status text NOT NULL DEFAULT 'active' CHECK(status IN('active','suspended')),created_at timestamptz NOT NULL DEFAULT now());
 GRANT SELECT ON app.users TO app_runtime;
 DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END $$;
 REVOKE ALL ON SCHEMA app FROM PUBLIC,anon,authenticated;`;
 for(const [filename,sql] of [['neon_base',base],['20260915000100_financial_core.sql',await readFile('supabase/migrations/20260915000100_financial_core.sql','utf8')]]){
  const hash=createHash('sha256').update(sql!).digest('hex');const applied=(await admin.query('SELECT checksum FROM app.schema_migrations WHERE name=$1',[filename])).rows[0];if(applied){if(applied.checksum!==hash)throw new Error('Migration aplicada foi modificada.');continue;}await admin.query('BEGIN');try{await admin.query(sql!);await admin.query('INSERT INTO app.schema_migrations(name,checksum) VALUES($1,$2)',[filename,hash]);await admin.query('COMMIT');}catch(e){await admin.query('ROLLBACK');throw e;}
 }
 // Auth owns only its own tables; the financial runtime has no DDL or ledger update grants.
 await admin.query('GRANT SELECT,INSERT,UPDATE,DELETE ON public.auth_user,public.auth_account,public.auth_session,public.auth_verification,public.auth_rate_limit TO app_runtime');
 const stmt=(await admin.query("SELECT format('ALTER ROLE app_runtime PASSWORD %L',$1::text) AS sql",[secrets.runtimePassword])).rows[0].sql;await admin.query(stmt);
 let user=(await admin.query('SELECT id FROM public.auth_user WHERE email=$1',[secrets.email])).rows[0];
 if(!user){const result=await auth.api.signUpEmail({body:{email:secrets.email,password:secrets.password,name:'Administrador de testes'}});user=result.user;}
 await admin.query('INSERT INTO app.users(id,email,display_name) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING',[user.id,secrets.email,'Administrador de testes']);
 await admin.query('INSERT INTO app.access_policies(user_id,is_owner) VALUES($1,true) ON CONFLICT(user_id) DO NOTHING',[user.id]);
 const runtime=new URL(env.DATABASE_URL??connection);runtime.username='app_runtime';runtime.password=secrets.runtimePassword;
 await writeFile('.local/cloud-runtime.env',`APP_DATABASE_URL=${runtime.href}\nBETTER_AUTH_SECRET=${secrets.authSecret}\nBETTER_AUTH_URL=${url}\n`);
 await writeFile('.local/cloud-test-env.json',JSON.stringify({databaseUrl:runtime.href,adminDatabaseUrl:connection,actor:user.id}));
 console.log('Banco cloud, autenticação e administrador de teste provisionados. Segredos somente em .local.');
}finally{await admin.end();}
