import type {FastifyInstance,FastifyRequest} from 'fastify';
import {z} from 'zod';
import {AppError} from '../../../packages/contracts/src/index.js';
import {accountSchema,legalEntitySchema,entrySchema,listSchema,catalogSchemas,id,name,policySchema,settleSchema,reverseSchema,transferSchema,invitationSchema, type Catalog} from '../../../packages/contracts/src/finance.js';
import {Finance,type Context} from '../../../packages/domain/src/finance.js';
export function parse<T>(schema:z.ZodType<T>,input:unknown):T{const r=schema.safeParse(input);if(!r.success){const fields:Record<string,string[]>={};for(const e of r.error.issues)(fields[e.path.join('.')||'form']??=[]).push(e.message);throw new AppError(422,'VALIDATION_ERROR','Confira os campos informados.',fields);}return r.data;}
export async function financeRoutes(app:FastifyInstance,f:Finance,authenticate:(r:FastifyRequest)=>Promise<string>){
 const context=async(req:FastifyRequest):Promise<Context>=>{const actor=await authenticate(req);const match=req.headers['if-match'];let version;if(match!==undefined){const value=String(match).replace(/^"|"$/g,'');if(!/^[1-9]\d{0,8}$/.test(value))throw new AppError(400,'INVALID_VERSION','Versão inválida.');version=Number(value);}const key=req.headers['idempotency-key'];return{actor,requestId:req.id,key:typeof key==='string'?key:undefined,version};};
 const rid=(req:FastifyRequest)=>parse(id,(req.params as {id:string}).id);
 app.get('/v1/organization-profile',async r=>f.profile(await context(r)));
 app.patch('/v1/organization-profile',async r=>f.organization(await context(r),parse(z.object({name}).strict(),r.body).name));
 app.get('/v1/legal-entities',async r=>({items:await f.listEntities(await context(r))}));
 app.post('/v1/legal-entities',async r=>f.entity(await context(r),parse(legalEntitySchema,r.body)));
 app.patch('/v1/legal-entities/:id',async r=>f.entity(await context(r),parse(legalEntitySchema,r.body),rid(r)));
 app.get('/v1/accounts',async r=>({items:await f.listAccounts(await context(r))}));
 app.post('/v1/accounts',async r=>f.createAccount(await context(r),parse(accountSchema,r.body)));
 app.patch('/v1/accounts/:id',async r=>f.updateAccount(await context(r),rid(r),parse(z.object({name,status:z.enum(['active','archived'])}).strict(),r.body)));
 for(const key of Object.keys(catalogSchemas) as Catalog[]){app.get(`/v1/${key}`,async r=>({items:await f.catalog(await context(r),key)}));app.post(`/v1/${key}`,async r=>f.saveCatalog(await context(r),key,parse(catalogSchemas[key],r.body)));app.patch(`/v1/${key}/:id`,async r=>f.saveCatalog(await context(r),key,parse(catalogSchemas[key],r.body),rid(r)));}
 app.get('/v1/entries',async r=>f.entries(await context(r),parse(listSchema,r.query)));
 app.get('/v1/agenda',async r=>f.entries(await context(r),parse(listSchema,r.query),true));
 app.get('/v1/entries/:id',async r=>f.detail(await context(r),rid(r)));
 app.post('/v1/entries',async r=>f.entry(await context(r),parse(entrySchema,r.body)));
 app.patch('/v1/entries/:id',async r=>f.entry(await context(r),parse(entrySchema,r.body),rid(r)));
 app.post('/v1/entries/:id/settlements',async r=>f.mutateEntry(await context(r),rid(r),'settle',parse(settleSchema,r.body)));
 app.post('/v1/entries/:id/reverse',async r=>f.mutateEntry(await context(r),rid(r),'reverse',parse(reverseSchema,r.body)));
 app.post('/v1/entries/:id/cancel',async r=>f.mutateEntry(await context(r),rid(r),'cancel',parse(z.object({reason:z.string().trim().min(3).max(500)}).strict(),r.body)));
 app.post('/v1/transfers',async r=>f.transfer(await context(r),parse(transferSchema,r.body)));
 app.post('/v1/transfers/:id/reverse',async r=>f.reverseTransfer(await context(r),rid(r),parse(reverseSchema,r.body)));
 app.get('/v1/transfers',async r=>{const ctx=await context(r);return f.transaction(ctx,async t=>{f.permit(t,'entries:view');return{items:(await t.db.query(`SELECT tr.*,a.name AS source_name,b.name AS destination_name FROM app.transfers tr JOIN app.accounts a ON a.id=tr.source_account_id JOIN app.accounts b ON b.id=tr.destination_account_id WHERE $1 OR(a.id=ANY($2::bigint[]) AND b.id=ANY($2::bigint[]) AND a.legal_entity_id=ANY($3::bigint[]) AND b.legal_entity_id=ANY($3::bigint[])) ORDER BY tr.id DESC LIMIT 200`,[t.policy.is_owner,t.policy.account_ids,t.policy.legal_entity_ids])).rows};});});
 app.get('/v1/dashboard',async r=>f.dashboard(await context(r),parse(listSchema,r.query)));
 app.get('/v1/accounts/:id/statement',async r=>f.statement(await context(r),rid(r),parse(listSchema,r.query)));
 app.get('/v1/users',async r=>f.transaction(await context(r),async t=>{f.permit(t,'users:manage');return{items:(await t.db.query('SELECT u.id,u.email,u.display_name,u.status,p.* FROM app.users u JOIN app.access_policies p ON p.user_id=u.id ORDER BY u.display_name')).rows};}));
 app.patch('/v1/users/:id/policy',async r=>{const uid=parse(z.uuid(),(r.params as {id:string}).id);const data=parse(z.object({status:z.enum(['active','suspended']),policy:policySchema}).strict(),r.body);const ctx=await context(r);
  // Serialize policy administration before taking per-user locks to protect the last owner.
  return await f.command(ctx,`policy:${uid}`,data,async t=>{if(!t.policy.is_owner)throw new AppError(403,'OWNER_REQUIRED','Somente proprietários podem alterar acessos.');const before=(await t.db.query('SELECT u.status,p.* FROM app.users u JOIN app.access_policies p ON p.user_id=u.id WHERE u.id=$1 FOR UPDATE OF u,p',[uid])).rows[0];if(!before)throw new AppError(404,'NOT_FOUND','Usuário não encontrado.');f.version(t,before);
   const owners=(await t.db.query("SELECT count(*)::int AS n FROM app.users u JOIN app.access_policies p ON p.user_id=u.id WHERE u.status='active' AND p.is_owner")).rows[0].n;if(before.is_owner&&before.status==='active'&&(!data.policy.is_owner||data.status!=='active')&&owners<=1)throw new AppError(409,'LAST_OWNER','Mantenha ao menos um proprietário ativo.');
   await t.db.query('UPDATE app.users SET status=$2 WHERE id=$1',[uid,data.status]);const p=data.policy;await t.db.query('UPDATE app.access_policies SET is_owner=$2,permissions=$3,legal_entity_ids=$4,account_ids=$5,directions=$6,groups=$7,version=version+1 WHERE user_id=$1',[uid,p.is_owner,p.permissions,p.legal_entity_ids,p.account_ids,p.directions,p.groups]);await f.audit(t,'user',uid,'policy',before,data);return{id:uid,version:before.version+1};});});
 app.get('/v1/invitations',async r=>f.transaction(await context(r),async t=>{f.permit(t,'users:manage');return{items:(await t.db.query('SELECT id,email,display_name,status,expires_at,created_at FROM app.invitations ORDER BY id DESC LIMIT 200')).rows};}));
 app.post('/v1/invitations',async r=>{const data=parse(invitationSchema,r.body);return f.command(await context(r),'invitation',data,async t=>{f.permit(t,'users:manage');if(!t.policy.is_owner)throw new AppError(403,'OWNER_REQUIRED','Somente proprietários podem conceder acesso.');
  // Delivery is deliberately unavailable until an SMTP provider is configured.
  throw new AppError(503,'EMAIL_NOT_CONFIGURED','Convites por e-mail ainda não estão disponíveis neste ambiente de teste.');});});
 app.get('/v1/audit-events',async r=>f.transaction(await context(r),async t=>{if(!t.policy.is_owner)throw new AppError(403,'OWNER_REQUIRED','O histórico completo é exclusivo do proprietário.');return{items:(await t.db.query('SELECT * FROM app.audit_events ORDER BY occurred_at DESC,id DESC LIMIT 200')).rows};}));
}
