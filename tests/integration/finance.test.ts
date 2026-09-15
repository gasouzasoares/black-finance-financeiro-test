import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {Finance,today,type Context} from '../../packages/domain/src/finance.js';
import {createPool} from '../../packages/domain/src/db.js';
import {AppError} from '../../packages/contracts/src/index.js';
import {entrySchema,validCnpj} from '../../packages/contracts/src/finance.js';
import {buildApp} from '../../apps/api/src/app.js';
const env=JSON.parse(await readFile('.local/test-env.json','utf8'));
const target=new URL(env.adminDatabaseUrl);if(!['localhost','127.0.0.1'].includes(target.hostname)||target.port!=='54322')throw new Error('Suíte financeira exige banco local.');
test('financial core: exact ledger, atomicity, concurrency, scoped APIs and 1000 commands',async t=>{
 const admin=new pg.Pool({connectionString:env.adminDatabaseUrl,max:2});const pool=createPool(env.databaseUrl);const f=new Finance(pool);t.after(async()=>{await pool.end();await admin.end();});
 const actor=(await admin.query('SELECT id FROM app.users WHERE email=$1',[env.email])).rows[0].id;
 await admin.query('INSERT INTO app.access_policies(user_id,is_owner) VALUES($1,true) ON CONFLICT(user_id) DO NOTHING',[actor]);
 const ctx=(version?:number,key=randomUUID()):Context=>({actor,requestId:randomUUID(),key,version});
 const cnpj=(n:number)=>{let s=String(n).padStart(12,'0');for(let round=0;round<2;round++){let total=0;for(let i=s.length-1,w=2;i>=0;i--,w=w===9?2:w+1)total+=(s.charCodeAt(i)-48)*w;const rem=total%11;s+=String(rem<2?0:11-rem);}return s;};
 assert.equal(validCnpj('12.ABC.345/01DE-35'),true);assert.equal(validCnpj('00000000000000'),false);
 const suffix=Date.now()%10000000000;const entities=[];for(let i=0;i<2;i++)entities.push(await f.entity(ctx(),{name:`Teste ${suffix} ${i}`,cnpj:cnpj(suffix*10+i),status:'active'}));
 const accounts=[];for(let i=0;i<4;i++)accounts.push(await f.createAccount(ctx(),{legal_entity_id:entities[i%2]!.id,name:`Conta ${i}`,kind:'bank',opening_on:'2026-01-01',opening_minor:'100000',is_default:i<2}));
 const account=String(accounts[0]!.id);const category=await f.saveCatalog(ctx(),'categories',{name:`Receita ${suffix}`,direction:'income',reporting_group:'revenue',status:'active'});
 const input=(amount='10000')=>entrySchema.parse({account_id:account,title:'Contrato de teste',direction:'income',amount_minor:amount,due_on:today(),competence_on:today(),allocations:[{amount_minor:amount,category_id:String(category.id)}]});
 const entry=await f.entry(ctx(),input());const key=randomUUID();const settleCtx=ctx(1,key);
 const results=await Promise.all(Array.from({length:20},()=>f.mutateEntry(settleCtx,String(entry.id),'settle',{settled_on:today(),reason:''})));
 assert.equal(new Set(results.map(x=>x.id)).size,1);assert.equal((await admin.query('SELECT count(*)::int AS n FROM app.settlements WHERE entry_id=$1',[entry.id])).rows[0].n,1);
 await assert.rejects(()=>f.mutateEntry(ctx(1,key),String(entry.id),'settle',{settled_on:'2026-01-02',reason:''}),(e:unknown)=>e instanceof AppError&&e.code==='IDEMPOTENCY_CONFLICT');
 await assert.rejects(()=>f.mutateEntry(ctx(2),String(entry.id),'cancel',{reason:'teste'}),(e:unknown)=>e instanceof AppError&&e.statusCode===409);
 const reversed=await f.mutateEntry(ctx(2),String(entry.id),'reverse',{effective_on:today(),reason:'Conferência'});assert.equal(reversed.status,'open');
 assert.equal((await admin.query('SELECT balance_minor FROM app.account_balances WHERE account_id=$1',[account])).rows[0].balance_minor,'100000');
 const contest=await f.entry(ctx(),input());const contested=await Promise.allSettled(Array.from({length:20},()=>f.mutateEntry(ctx(1),String(contest.id),'settle',{settled_on:today()})));assert.equal(contested.filter(r=>r.status==='fulfilled').length,1);
 const future=await f.entry(ctx(),input());await assert.rejects(()=>f.mutateEntry(ctx(1),String(future.id),'settle',{settled_on:'2100-01-01'}),(e:unknown)=>e instanceof AppError&&e.code==='FUTURE_DATE');
 const transfer=await f.transfer(ctx(),{source_account_id:accounts[0]!.id,destination_account_id:accounts[1]!.id,amount_minor:'12345',effective_on:today(),reason:'Teste'});await f.reverseTransfer(ctx(1),String(transfer.id),{effective_on:today(),reason:'Conferência'});
 await assert.rejects(()=>pool.query('UPDATE app.cash_postings SET signed_minor=1 WHERE account_id=$1',[account]));
 await assert.rejects(()=>pool.query('DELETE FROM app.audit_events WHERE actor_id=$1',[actor]));
 // A real second identity proves negative list/detail/total policies without mocks of SQL.
 const restricted=randomUUID();await admin.query("INSERT INTO auth.users(id,email) VALUES($1,$2)",[restricted,`restricted-${suffix}@finance.local`]);await admin.query("INSERT INTO app.users(id,email,display_name) VALUES($1,$2,'Restrito')",[restricted,`restricted-${suffix}@finance.local`]);
 await admin.query('INSERT INTO app.access_policies(user_id,permissions,legal_entity_ids,account_ids,directions,groups) VALUES($1,$2,$3,$4,$5,$6)',[restricted,['entries:view','dashboard:view','accounts:view'],[entities[1]!.id],[accounts[1]!.id],['income'],['revenue']]);
 const app=await buildApp({finance:f,verify:async token=>token,findUser:async uid=>(await pool.query('SELECT * FROM app.users WHERE id=$1',[uid])).rows[0],ping:async()=>{},publicConfig:{supabaseUrl:'http://localhost',supabasePublishableKey:'test'},logger:false});t.after(()=>app.close());
 const headers={authorization:`Bearer ${restricted}`};const query=`from=2026-01-01&to=2026-12-31`;
 assert.equal((await app.inject({url:`/v1/entries/${entry.id}`,headers})).statusCode,404);
 assert.equal((await app.inject({url:`/v1/entries?${query}`,headers})).json().items.length,0);
 const totals=(await app.inject({url:`/v1/dashboard?${query}`,headers})).json();assert.equal(totals.receivable_minor,'0');assert.equal(totals.balance_minor,null);
 assert.equal((await app.inject({url:`/v1/accounts/${account}/statement?${query}`,headers})).statusCode,403);
 assert.equal((await app.inject({url:'/v1/entries'})).statusCode,401);
 assert.equal((await app.inject({method:'POST',url:'/v1/entries',headers:{authorization:`Bearer ${actor}`},payload:{amount_minor:'-1'}})).statusCode,422);
 const ownerPolicy=(await admin.query('SELECT version FROM app.access_policies WHERE user_id=$1',[actor])).rows[0];
 const lastOwner=await app.inject({method:'PATCH',url:`/v1/users/${actor}/policy`,headers:{authorization:`Bearer ${actor}`,'idempotency-key':randomUUID(),'if-match':String(ownerPolicy.version)},payload:{status:'active',policy:{is_owner:false,permissions:[],legal_entity_ids:[],account_ids:[],directions:[],groups:[]}}});
 assert.equal(lastOwner.statusCode,409);assert.equal(lastOwner.json().code,'LAST_OWNER');
 await admin.query('UPDATE app.access_policies SET permissions=$2 WHERE user_id=$1',[restricted,['entries:view','entries:create','dashboard:view','accounts:view']]);
 const scopedCtx={actor:restricted,requestId:randomUUID(),key:randomUUID()};const ownInput={...input(),account_id:String(accounts[1]!.id)};const scopedEntry=await f.entry(scopedCtx,ownInput);
 assert.equal((await app.inject({url:`/v1/entries/${scopedEntry.id}`,headers})).statusCode,200);
 await admin.query('UPDATE app.access_policies SET account_ids=\'{}\' WHERE user_id=$1',[restricted]);
 await assert.rejects(()=>f.entry(scopedCtx,ownInput),(e:unknown)=>e instanceof AppError&&e.statusCode===404);
 assert.equal((await app.inject({url:`/v1/entries?${query}`,headers})).json().items.length,0);
 await admin.query("UPDATE app.users SET status='suspended' WHERE id=$1",[restricted]);assert.equal((await app.inject({url:`/v1/entries?${query}`,headers})).statusCode,403);
 // Deterministic pseudo-random sequence with independently recomputed invariants.
 let state=41021;const random=()=>{state=(state*1664525+1013904223)>>>0;return state;};let commands=0;
 for(let i=0;i<334;i++){
  const amount=String(random()%100000+1);const e=await f.entry(ctx(),{...input(amount),account_id:String(accounts[i%4]!.id)});commands++;
  const s=await f.mutateEntry(ctx(Number(e.version)),String(e.id),'settle',{settled_on:today()});commands++;
  await f.mutateEntry(ctx(Number(s.version)),String(e.id),'reverse',{effective_on:today(),reason:'Teste de invariantes'});commands++;
 }
 assert.ok(commands>=1000);
 const invariants=await admin.query(`SELECT a.id, b.balance_minor,coalesce(p.total,0)::text AS postings,coalesce(d.total,0)::text AS daily FROM app.accounts a JOIN app.account_balances b ON b.account_id=a.id LEFT JOIN (SELECT account_id,sum(signed_minor) total FROM app.cash_postings GROUP BY account_id)p ON p.account_id=a.id LEFT JOIN(SELECT account_id,sum(net_minor) total FROM app.cash_daily GROUP BY account_id)d ON d.account_id=a.id WHERE a.id=ANY($1::bigint[])`,[accounts.map(a=>a.id)]);
 for(const r of invariants.rows){assert.equal(r.balance_minor,r.postings);assert.equal(r.balance_minor,r.daily);assert.equal(r.balance_minor,r.id===account?'110000':'100000');}
 // Closed policy must not leak an idempotent response after access removal.
 await f.saveCatalog(ctx(1),'categories',{name:`Renomeada ${suffix}`,direction:'income',reporting_group:'fixed',status:'active'},String(category.id));
 assert.equal((await f.detail(ctx(),String(entry.id))).allocations[0].reporting_group,'revenue');
});
