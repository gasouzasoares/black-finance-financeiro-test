import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import pg from 'pg';
const cloud=process.argv.includes('--cloud');
const env=JSON.parse(await readFile(cloud?'.local/cloud-test-env.json':'.local/test-env.json','utf8'));
const target=new URL(env.adminDatabaseUrl);
if(cloud){const project=JSON.parse(await readFile('.vercel/project.json','utf8'));if(project.projectName!=='black-finance-financeiro-test'||!target.hostname.endsWith('.neon.tech'))throw new Error('Projeto de teste incorreto.');}
else if(!['localhost','127.0.0.1'].includes(target.hostname)||target.port!=='54322')throw new Error('Banco local incorreto.');
const db=new pg.Client({connectionString:env.adminDatabaseUrl});
await db.connect();
try{
 await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(7172702)');
 await db.query('CREATE TABLE IF NOT EXISTS app.schema_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
 for(const name of ['20260915000300_evidence.sql','20260915000400_evidence_review_indexes.sql','20260915000500_analysis.sql','20260915000600_drive_intake.sql']){const sql=await readFile(`supabase/migrations/${name}`,'utf8'),hash=createHash('sha256').update(sql).digest('hex');
 const previous=(await db.query('SELECT checksum FROM app.schema_migrations WHERE name=$1',[name])).rows[0];
 if(previous&&previous.checksum!==hash)throw new Error('Migration já aplicada foi alterada.');
 if(!previous){await db.query(sql);await db.query('INSERT INTO app.schema_migrations(name,checksum) VALUES($1,$2)',[name,hash]);}
 }await db.query('COMMIT');console.log('Estrutura de evidências atualizada.');
}catch(e){await db.query('ROLLBACK');throw e;}finally{await db.end();}
