import {createHash} from 'node:crypto';
import {day} from '../../contracts/src/finance.js';
import {AppError} from '../../contracts/src/index.js';

export type ImportedRow={line:number;external_id:string;date:string;title:string;amount_minor:string;direction:'income'|'expense';error?:string};
const invalid=(message:string):never=>{throw new AppError(422,'IMPORT_FORMAT',message);};
const digest=(text:string)=>createHash('sha256').update(text).digest('hex');

function decimal(raw:string,separator:'.'|',') {
 const s=raw.trim();
 const pattern=separator==='.'?/^-?\d+(?:\.\d{1,2})?$/:/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/;
 if(!pattern.test(s))return invalid('Valor monetário inválido.');
 const normalized=separator===','?s.replace(/\./g,'').replace(',','.'):s;
 const [whole,fraction='']=normalized.replace('-','').split('.');
 const value=(BigInt(whole!)*100n+BigInt(fraction.padEnd(2,'0')))*(normalized.startsWith('-')?-1n:1n);
 if(value===0n||value>999999999999999n||value< -999999999999999n)return invalid('Valor deve ser diferente de zero e estar dentro do limite.');
 return value;
}

// Quoted fields, escaped quotes and embedded newlines are handled without evaluating cells.
export function csvCells(source:string):string[][] {
 const text=source.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
 const delimiter=text.slice(0,text.indexOf('\n')<0?text.length:text.indexOf('\n')).includes(';')?';':',';
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++){
  const c=text[i]!;
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;}
  else if(c===delimiter||c==='\n'){row.push(cell);cell='';closed=false;if(c==='\n'){if(row.some(v=>v.trim()))rows.push(row);row=[];}}
  else if(c==='"'&&!cell&&!closed)quoted=true;
  else{if(closed||c==='"')return invalid('Aspas inválidas no CSV.');cell+=c;}
 }
 if(quoted)return invalid('O CSV contém um campo com aspas não fechadas.');
 row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
 if(rows.length>501)return invalid('Importe até 500 linhas por arquivo.');
 return rows;
}

export function parseCsv(source:string):ImportedRow[] {
 const [header,...records]=csvCells(source);if(!header)return invalid('Arquivo vazio.');
 const names=header.map(v=>v.trim().toLowerCase());
 for(const field of ['data','descricao','valor'])if(!names.includes(field))return invalid('Use as colunas data, descricao e valor; id é opcional.');
 if(new Set(names).size!==names.length)return invalid('Existem colunas repetidas.');
 return records.map((cells,index)=>{
  const get=(name:string)=>cells[names.indexOf(name)]?.trim()??'';
  const row:ImportedRow={line:index+2,external_id:'',date:get('data'),title:get('descricao'),amount_minor:'0',direction:'income'};
  try{
   if(cells.length!==names.length)invalid('Quantidade de colunas diferente do cabeçalho.');
   if(/^\d{2}\/\d{2}\/\d{4}$/.test(row.date))row.date=row.date.split('/').reverse().join('-');
   if(!day.safeParse(row.date).success)invalid('Data inválida; use DD/MM/AAAA ou AAAA-MM-DD.');
   if(!row.title||row.title.length>240)invalid('Descrição obrigatória, com até 240 caracteres.');
   const value=decimal(get('valor'),',');row.direction=value>0n?'income':'expense';row.amount_minor=(value<0n?-value:value).toString();
   const supplied=get('id');if(supplied.length>255)invalid('Identificador com mais de 255 caracteres.');
   row.external_id=supplied?`csv:id:${digest(supplied)}`:`csv:row:${digest(JSON.stringify([row.date,row.title,row.direction,row.amount_minor]))}`;
  }catch(e){row.error=(e as Error).message;}
  return row;
 });
}

const decode=(s:string)=>s.replace(/&(?:amp|lt|gt|quot|apos);/g,e=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[e]!));
export function parseOfx(source:string):{bank_identity:string;rows:ImportedRow[]} {
 if(/<!DOCTYPE|<!ENTITY/i.test(source))return invalid('Declarações de entidades XML não são aceitas.');
 const field=(block:string,name:string)=>decode(new RegExp(`<${name}>\\s*([^<\\r\\n]*)`,'i').exec(block)?.[1]?.trim()??'');
 if(!/<OFX[>\s]/i.test(source)||field(source,'CURDEF')!=='BRL')return invalid('Use um extrato OFX em reais (BRL).');
 const accounts=[...source.matchAll(/<(?:BANKACCTFROM|CCACCTFROM)>[\s\S]*?<\/(?:BANKACCTFROM|CCACCTFROM)>/gi)];
 if(accounts.length!==1)return invalid('O arquivo deve conter exatamente uma conta bancária ou cartão.');
 const account=field(accounts[0]![0],'ACCTID');if(!account)return invalid('Identificação de conta ausente no OFX.');
 const identity=digest(JSON.stringify([field(accounts[0]![0],'BANKID'),field(accounts[0]![0],'BRANCHID'),account,field(accounts[0]![0],'ACCTTYPE')]));
 const blocks=[...source.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)];
 if(!blocks.length||blocks.length>500)return invalid('O extrato deve conter de 1 a 500 movimentos.');
 const rows=blocks.map((match,index)=>{
  const block=match[1]!;const rawDate=field(block,'DTPOSTED').slice(0,8);
  const row:ImportedRow={line:index+1,external_id:'',date:`${rawDate.slice(0,4)}-${rawDate.slice(4,6)}-${rawDate.slice(6,8)}`,title:field(block,'MEMO')||field(block,'NAME')||'Movimento do extrato',amount_minor:'0',direction:'income'};
  try{
   if(!day.safeParse(row.date).success)invalid('Data de movimento inválida.');
   const fitid=field(block,'FITID');if(!fitid||fitid.length>255)invalid('FITID ausente ou inválido.');
   if(field(block,'CORRECTFITID'))invalid('Movimento de correção bancária requer revisão manual.');
   const amount=decimal(field(block,'TRNAMT'),'.');row.direction=amount>0n?'income':'expense';row.amount_minor=(amount<0n?-amount:amount).toString();
   row.title=row.title.slice(0,240);row.external_id=`ofx:${identity}:${digest(fitid)}`;
  }catch(e){row.error=(e as Error).message;}
  return row;
 });
 return {bank_identity:identity,rows};
}

export function occurrenceDate(start:string,index:number,frequency:'weekly'|'monthly'|'quarterly'|'yearly') {
 const date=new Date(`${start}T12:00:00Z`);
 if(frequency==='weekly')date.setUTCDate(date.getUTCDate()+index*7);
 else{
  const original=date.getUTCDate();date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth()+index*({monthly:1,quarterly:3,yearly:12}[frequency]));
  const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(original,last));
 }
 return date.toISOString().slice(0,10);
}
