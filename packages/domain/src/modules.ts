import {mappedRows} from './xlsx.js';
import type {SheetMapping} from '../../contracts/src/evidence.js';
import {createHash} from 'node:crypto';

import {Finance,type Context,type Tx} from './finance.js';

import {AppError} from '../../contracts/src/index.js';

import {entrySchema,type ListQuery} from '../../contracts/src/finance.js';

import {type InvoiceInput,type RecurrenceInput} from '../../contracts/src/modules.js';

import {parseCsv,parseOfx,occurrenceDate,type ImportedRow} from './import-parser.js';



const fail=(message:string,status=422):never=>{throw new AppError(status,'MODULE_VALIDATION',message);};

export class InternalModules {

 constructor(public f:Finance){}

 async scoped(t:Tx,table:'invoices'|'recurrences'|'import_batches',id:string,lock=false){

  const row=(await t.db.query(`SELECT x.* FROM app.${table} x JOIN app.accounts a ON a.id=x.account_id WHERE x.id=$1 AND ($2 OR(a.id=ANY($3::bigint[]) AND a.legal_entity_id=ANY($4::bigint[])))${lock?' FOR UPDATE OF x':''}`,[id,t.policy.is_owner,t.policy.account_ids,t.policy.legal_entity_ids])).rows[0];

  if(!row)fail('Registro não encontrado.',404);
  if(!t.policy.is_owner&&table==='invoices'){
   if(row.entry_id){const e=(await t.db.query('SELECT * FROM app.entries WHERE id=$1',[row.entry_id])).rows[0];await this.f.checkEntry(t,e);}
   else{const c=row.category_id?(await t.db.query('SELECT reporting_group FROM app.categories WHERE id=$1',[row.category_id])).rows[0]:null;if(!this.f.allowedEntry(t,'income',[c?.reporting_group??'unclassified']))fail('Registro não encontrado.',404);}
  }
  if(!t.policy.is_owner&&table==='recurrences')await this.f.allocationData(t,entrySchema.parse(row.template));
  return row;

 }

 async list(ctx:Context,kind:'invoices'|'recurrences'|'import_batches',q:ListQuery){return this.f.transaction(ctx,async t=>{

  this.f.permit(t,kind==='recurrences'?'templates:view':kind==='import_batches'?'imports:view':'invoices:view');

  const values:unknown[]=[t.policy.is_owner,t.policy.account_ids,t.policy.legal_entity_ids];let filter='($1 OR(a.id=ANY($2::bigint[]) AND a.legal_entity_id=ANY($3::bigint[])))';

  if(q.account_id){values.push(q.account_id);filter+=` AND a.id=$${values.length}`;}if(q.legal_entity_id){values.push(q.legal_entity_id);filter+=` AND a.legal_entity_id=$${values.length}`;}

  if(kind==='invoices'){values.push(q.from,q.to);filter+=` AND x.issued_on BETWEEN $${values.length-1} AND $${values.length}`;}

  const extra=kind==='invoices'?",p.name AS party_name,e.status AS entry_status":'';

  const joins=kind==='invoices'?' LEFT JOIN app.parties p ON p.id=x.party_id LEFT JOIN app.entries e ON e.id=x.entry_id':'';

  const rows=(await t.db.query(`SELECT x.*,a.name AS account_name${extra} FROM app.${kind} x JOIN app.accounts a ON a.id=x.account_id${joins} WHERE ${filter} ORDER BY x.id DESC LIMIT 200`,values)).rows;
  if(t.policy.is_owner||kind==='import_batches')return {items:rows};
  const visible=[];for(const row of rows){try{await this.scoped(t,kind,String(row.id));visible.push(row);}catch(e){if(!(e instanceof AppError)||![403,404].includes(e.statusCode))throw e;}}return {items:visible};

 });}

 async createInvoice(ctx:Context,d:InvoiceInput){return this.f.command(ctx,'invoices:create',d,async t=>{

  await this.f.accounts(t,[d.account_id]);if(!(await t.db.query("SELECT 1 FROM app.parties WHERE id=$1 AND status='active'",[d.party_id])).rowCount)fail('Contato indisponível.');

  const total=d.items.reduce((n,i)=>n+BigInt(i.quantity)*BigInt(i.unit_minor),0n)-BigInt(d.discount_minor);

  await this.f.allocationData(t,entrySchema.parse({account_id:d.account_id,party_id:d.party_id,title:d.title,direction:'income',amount_minor:total.toString(),due_on:d.due_on,competence_on:d.issued_on,allocations:[{amount_minor:total.toString(),category_id:d.category_id}]}));

  const r=(await t.db.query('INSERT INTO app.invoices(account_id,party_id,title,issued_on,due_on,items,discount_minor,total_minor,notes,category_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',[d.account_id,d.party_id,d.title,d.issued_on,d.due_on,JSON.stringify(d.items),d.discount_minor,total.toString(),d.notes,d.category_id])).rows[0];await this.f.audit(t,'invoice',r.id,'create',null,r);return r;

 });}

 async invoiceAction(ctx:Context,id:string,action:'issue'|'cancel'){return this.f.command(ctx,'invoices:update',{id,action},async t=>{

  const r=await this.scoped(t,'invoices',id,true);this.f.version(t,r);if(r.status!=='draft')fail('Somente rascunhos podem ser emitidos ou cancelados. Para corrigir uma fatura emitida, use a transação vinculada.',409);

  let entry=null;if(action==='issue')entry=await this.f.writeEntry(t,entrySchema.parse({account_id:r.account_id,party_id:r.party_id,title:`Fatura ${r.id} · ${r.title}`.slice(0,240),direction:'income',amount_minor:r.total_minor,due_on:r.due_on,competence_on:r.issued_on,notes:r.notes,allocations:[{amount_minor:r.total_minor,category_id:r.category_id}]}));

  const result=(await t.db.query('UPDATE app.invoices SET status=$2,entry_id=$3,version=version+1 WHERE id=$1 RETURNING *',[id,action==='issue'?'issued':'cancelled',entry?.id??null])).rows[0];await this.f.audit(t,'invoice',id,action,r,result);return result;

 },async t=>{const r=await this.scoped(t,'invoices',id);if(action==='issue')this.f.permit(t,'entries:create');if(r.entry_id){const e=(await t.db.query('SELECT * FROM app.entries WHERE id=$1',[r.entry_id])).rows[0];await this.f.checkEntry(t,e);}});}

 async createRecurrence(ctx:Context,d:RecurrenceInput){return this.f.command(ctx,'templates:create',{...d,account_id:d.entry.account_id},async t=>{

  await this.f.accounts(t,[d.entry.account_id]);await this.f.allocationData(t,d.entry);

  const r=(await t.db.query('INSERT INTO app.recurrences(account_id,template,frequency,start_on,end_on) VALUES($1,$2,$3,$4,$5) RETURNING *',[d.entry.account_id,d.entry,d.frequency,d.start_on,d.end_on])).rows[0];await this.f.audit(t,'recurrence',r.id,'create',null,r);return r;

 });}

 async recurrenceAction(ctx:Context,id:string,action:'generate'|'pause'|'resume'|'end',through:string){return this.f.command(ctx,'templates:update',{id,action,through},async t=>{

  const r=await this.scoped(t,'recurrences',id,true);this.f.version(t,r);if(r.status==='ended')fail('A recorrência foi encerrada.',409);

  let status=r.status,index=r.next_index,generated=0;

  if(action==='generate'){

   if(r.status!=='active')fail('Retome a recorrência antes de gerar.',409);

   const template=entrySchema.parse(r.template);await this.f.accounts(t,[template.account_id]);

   while(generated<24){const due=occurrenceDate(r.start_on,index,r.frequency);if(due>r.end_on){status='ended';break;}if(due>through)break;

    const e=await this.f.writeEntry(t,{...template,due_on:due,competence_on:due});await t.db.query('INSERT INTO app.recurrence_occurrences(recurrence_id,due_on,entry_id) VALUES($1,$2,$3)',[id,due,e.id]);index++;generated++;

   }

  }else status=action==='pause'?'paused':action==='resume'?'active':'ended';

  const result=(await t.db.query('UPDATE app.recurrences SET status=$2,next_index=$3,version=version+1 WHERE id=$1 RETURNING *',[id,status,index])).rows[0];await this.f.audit(t,'recurrence',id,action,r,{...result,generated});return {...result,generated,next_on:occurrenceDate(r.start_on,index,r.frequency)};

 },async t=>{const r=await this.scoped(t,'recurrences',id);await this.f.allocationData(t,entrySchema.parse(r.template));if(action==='generate')this.f.permit(t,'entries:create');});}

 async previewXlsx(ctx:Context,d:SheetMapping){ const rows=await mappedRows(d);return this.preview(ctx,{account_id:d.account_id,kind:'xlsx',filename:d.filename,content:JSON.stringify({sheet:d.sheet,header:d.header,rows})},rows); }
 async preview(ctx:Context,d:{account_id:string;kind:'csv'|'ofx'|'xlsx';filename:string;content:string},xlsxRows?:ImportedRow[]){

  const parsed=d.kind==='ofx'?parseOfx(d.content):{bank_identity:null,rows:xlsxRows??parseCsv(d.content)};

  if(!parsed.rows.length)fail('Arquivo sem movimentos.');

  const hash=createHash('sha256').update(d.content).digest('hex');

  return this.f.command(ctx,'imports:create',{account_id:d.account_id,kind:d.kind,filename:d.filename,hash},async t=>{

   await this.f.accounts(t,[d.account_id]);

   const previous=(await t.db.query('SELECT * FROM app.import_batches WHERE account_id=$1 AND kind=$2 AND content_hash=$3',[d.account_id,d.kind,hash])).rows[0];if(previous)return previous;

   const batch=(await t.db.query('INSERT INTO app.import_batches(account_id,kind,filename,content_hash,bank_identity,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[d.account_id,d.kind,d.filename,hash,parsed.bank_identity,ctx.actor])).rows[0];

   const seen=new Set<string>();const records=parsed.rows.map(row=>{

    if(!this.f.allowedEntry(t,row.direction,['unclassified']))row.error='Direção ou classificação fora do seu acesso.';

    const duplicate=seen.has(row.external_id);seen.add(row.external_id);

    return {line:row.line,payload:row,status:row.error?'invalid':duplicate?'duplicate':'pending',error:row.error??null};

   });

   await t.db.query(`INSERT INTO app.import_rows(batch_id,line,payload,status,error)

    SELECT $1,r.line,r.payload,CASE WHEN r.status='pending' AND EXISTS(SELECT 1 FROM app.import_fingerprints f WHERE f.account_id=$3 AND f.external_id=r.payload->>'external_id') THEN 'duplicate' ELSE r.status END,r.error

    FROM jsonb_to_recordset($2::jsonb) AS r(line integer,payload jsonb,status text,error text)`,[batch.id,JSON.stringify(records),d.account_id]);

   await this.f.audit(t,'import',batch.id,'preview',null,{kind:d.kind,lines:parsed.rows.length});return batch;

  });

 }

 async batch(ctx:Context,id:string){return this.f.transaction(ctx,async t=>{this.f.permit(t,'imports:view');const batch=await this.scoped(t,'import_batches',id);return {...batch,rows:(await t.db.query(`SELECT r.*,EXISTS(SELECT 1 FROM app.settlements s WHERE s.reversal_of=r.settlement_id) AS match_reversed FROM app.import_rows r WHERE batch_id=$1 ORDER BY line`,[id])).rows.filter(r=>this.f.allowedEntry(t,r.payload.direction,['unclassified']))};});}

 async importRows(ctx:Context,id:string,ids:string[]){return this.f.command(ctx,'imports:update',{id,ids},async t=>{

  const batch=await this.scoped(t,'import_batches',id,true);if(batch.kind!=='csv')fail('Use a conciliação para revisar movimentos OFX.');

  const rows=(await t.db.query('SELECT * FROM app.import_rows WHERE batch_id=$1 AND id=ANY($2::bigint[]) ORDER BY id FOR UPDATE',[id,ids])).rows;

  if(rows.length!==new Set(ids).size)fail('Linha não encontrada.',404);let imported=0,duplicates=0;

  for(const row of rows){if(row.status!=='pending')continue;const d=row.payload as ImportedRow;

   const claimed=await t.db.query('INSERT INTO app.import_fingerprints(account_id,external_id,row_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[batch.account_id,d.external_id,row.id]);

   if(!claimed.rowCount){await t.db.query("UPDATE app.import_rows SET status='duplicate',version=version+1 WHERE id=$1",[row.id]);duplicates++;continue;}

   const e=await this.f.writeEntry(t,entrySchema.parse({account_id:batch.account_id,title:d.title,direction:d.direction,amount_minor:d.amount_minor,due_on:d.date,competence_on:d.date,allocations:[{amount_minor:d.amount_minor}]}));

   await t.db.query("UPDATE app.import_rows SET status='imported',entry_id=$2,version=version+1 WHERE id=$1",[row.id,e.id]);imported++;

  }

  await this.finishBatch(t,id);await this.f.audit(t,'import',id,'confirm',null,{imported,duplicates});return {id,imported,duplicates};

 },async t=>{await this.scoped(t,'import_batches',id);this.f.permit(t,'entries:create');const rows=(await t.db.query('SELECT payload FROM app.import_rows WHERE batch_id=$1 AND id=ANY($2::bigint[])',[id,ids])).rows;if(rows.some(r=>!this.f.allowedEntry(t,r.payload.direction,['unclassified'])))fail('Classificação fora do seu acesso.',403);});}

 async finishBatch(t:Tx,id:string){await t.db.query("UPDATE app.import_batches SET status=CASE WHEN EXISTS(SELECT 1 FROM app.import_rows WHERE batch_id=$1 AND status='pending') THEN 'review' ELSE 'completed' END,version=version+1 WHERE id=$1",[id]);}

 async candidates(ctx:Context,batchId:string,rowId:string){return this.f.transaction(ctx,async t=>{

  this.f.permit(t,'reconciliation:view');this.f.permit(t,'entries:view');const b=await this.scoped(t,'import_batches',batchId);

  const row=(await t.db.query('SELECT payload FROM app.import_rows WHERE batch_id=$1 AND id=$2',[batchId,rowId])).rows[0];if(!row)fail('Movimento não encontrado.',404);const d=row.payload as ImportedRow;

  const candidates=(await t.db.query(`SELECT e.*,s.id AS settlement_id FROM app.entries e JOIN app.settlements s ON s.entry_id=e.id WHERE e.account_id=$1 AND e.direction=$2 AND e.amount_minor=$3 AND e.status='settled' AND s.settled_on=$4 AND s.reversal_of IS NULL AND NOT EXISTS(SELECT 1 FROM app.settlements rev WHERE rev.reversal_of=s.id) AND NOT EXISTS(SELECT 1 FROM app.import_rows matched WHERE matched.settlement_id=s.id) ORDER BY e.id DESC LIMIT 50`,[b.account_id,d.direction,d.amount_minor,d.date])).rows;

  const visible=[];for(const e of candidates){try{await this.f.checkEntry(t,e);visible.push(e);}catch(error){if(!(error instanceof AppError)||error.statusCode!==404)throw error;}}

  return {items:visible};

 });}

 async reconcile(ctx:Context,batchId:string,rowId:string,entryId:string|null){return this.f.command(ctx,'reconciliation:update',{batchId,rowId,entryId},t=>this.reconcileTx(t,batchId,rowId,entryId),async t=>{await this.scoped(t,'import_batches',batchId);this.f.permit(t,'entries:view');const row=(await t.db.query('SELECT payload FROM app.import_rows WHERE batch_id=$1 AND id=$2',[batchId,rowId])).rows[0];if(!row||!this.f.allowedEntry(t,row.payload.direction,['unclassified']))fail('Movimento não encontrado.',404);if(entryId){const e=(await t.db.query('SELECT * FROM app.entries WHERE id=$1',[entryId])).rows[0];if(!e)fail('Transação não encontrada.',404);await this.f.checkEntry(t,e);}});}

 async reconcileTx(t:Tx,batchId:string,rowId:string,entryId:string|null){this.f.permit(t,'reconciliation:update');
  const batch=await this.scoped(t,'import_batches',batchId,true);if(!['ofx','xlsx'].includes(batch.kind))fail('Use um extrato OFX ou XLSX.');

  const row=(await t.db.query('SELECT * FROM app.import_rows WHERE id=$1 AND batch_id=$2 FOR UPDATE',[rowId,batchId])).rows[0];if(!row)fail('Movimento não encontrado.',404);this.f.version(t,row);if(row.status!=='pending')fail('Movimento já revisado.',409);

  const d=row.payload as ImportedRow;let settlement=null;

  if(entryId){const e=(await t.db.query('SELECT * FROM app.entries WHERE id=$1 FOR UPDATE',[entryId])).rows[0];if(!e)fail('Transação não encontrada.',404);await this.f.checkEntry(t,e);

   if(e.account_id!==batch.account_id||e.direction!==d.direction||e.amount_minor!==d.amount_minor||e.status!=='settled')fail('Escolha uma transação liquidada na mesma conta, com direção e valor iguais.');

   settlement=(await t.db.query('SELECT s.* FROM app.settlements s WHERE s.entry_id=$1 AND s.reversal_of IS NULL AND NOT EXISTS(SELECT 1 FROM app.settlements rev WHERE rev.reversal_of=s.id) ORDER BY s.id DESC LIMIT 1',[entryId])).rows[0];

   if(!settlement||settlement.settled_on!==d.date)fail('A data de realização deve coincidir com o extrato.');

  }

  const claimed=await t.db.query('INSERT INTO app.import_fingerprints(account_id,external_id,row_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[batch.account_id,d.external_id,row.id]);if(!claimed.rowCount)fail('Movimento já revisado em outra importação.',409);

  const result=(await t.db.query('UPDATE app.import_rows SET status=$2,entry_id=$3,settlement_id=$4,version=version+1 WHERE id=$1 RETURNING *',[rowId,entryId?'matched':'ignored',entryId,settlement?.id??null])).rows[0];await this.finishBatch(t,batchId);await this.f.audit(t,'reconciliation',rowId,entryId?'match':'ignore',null,{entry_id:entryId});return result;

 }
 async dre(ctx:Context,q:ListQuery&{basis:'competence'|'cash'}){return this.f.transaction(ctx,async t=>{

  this.f.permit(t,'reports:view');const {sql,values}=this.f.entryFilter(t,{...q,category_id:undefined,cost_center_id:undefined,group:undefined,focus:undefined,status:undefined});

  let filter=sql.replace('e.due_on BETWEEN $6 AND $7',q.basis==='cash'?'s.settled_on BETWEEN $6 AND $7':'al.competence_on BETWEEN $6 AND $7');

  if(q.basis==='competence')filter+=" AND NOT al.cancelled";

  for(const [key,column] of [['category_id','category_id'],['cost_center_id','cost_center_id'],['group','reporting_group']] as const)if(q[key]){values.push(q[key]);filter+=` AND al.${column}=$${values.length}`;}

  const joins=q.basis==='cash'?' JOIN app.settlement_items si ON si.allocation_id=al.id JOIN app.settlements s ON s.id=si.settlement_id':'';

  const amount=q.basis==='cash'?'si.amount_minor * CASE WHEN s.reversal_of IS NULL THEN 1 ELSE -1 END':'al.amount_minor';

  const rows=(await t.db.query(`SELECT al.reporting_group,al.category_id,c.name AS category_name,sum((${amount})::numeric * CASE WHEN e.direction='income' THEN 1 ELSE -1 END)::text AS signed_minor FROM app.entries e JOIN app.accounts a ON a.id=e.account_id JOIN app.entry_allocations al ON al.entry_id=e.id LEFT JOIN app.categories c ON c.id=al.category_id${joins} WHERE ${filter} GROUP BY al.reporting_group,al.category_id,c.name ORDER BY al.reporting_group,c.name`,values)).rows;

  return {basis:q.basis,from:q.from,to:q.to,items:rows,total_minor:rows.reduce((s,r)=>s+BigInt(r.signed_minor),0n).toString()};

 });}

}
