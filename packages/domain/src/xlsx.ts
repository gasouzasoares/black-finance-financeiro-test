import ExcelJS from 'exceljs';
import {unzipSync} from 'fflate';
import {createHash} from 'node:crypto';
import {AppError} from '../../contracts/src/index.js';
import {day} from '../../contracts/src/finance.js';
import type {SheetMapping} from '../../contracts/src/evidence.js';
import type {ImportedRow} from './import-parser.js';
const fail=(message:string):never=>{throw new AppError(422,'XLSX_FORMAT',message);};
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export async function workbook(base64:string){
 const bytes=Buffer.from(base64,'base64');if(bytes.length>2000000||bytes[0]!==80||bytes[1]!==75)fail('Use XLSX de até 2 MB.');
 let total=0,count=0;try{unzipSync(bytes,{filter:f=>{total+=f.originalSize;count++;if(total>20000000||count>2000||/vbaProject|externalLinks/i.test(f.name))fail('Arquivo muito grande ou com macros/vínculos externos.');return false;}});}catch{fail('XLSX inválido, muito grande ou com macros/vínculos externos.');}
 const book=new ExcelJS.Workbook();try{await book.xlsx.load(bytes as unknown as Parameters<typeof book.xlsx.load>[0]);}catch{fail('Não foi possível ler o XLSX. Exporte novamente sem senha.');}
 if(book.worksheets.length>20||book.worksheets.some(s=>s.rowCount>600||s.columnCount>50))fail('Limite: 20 planilhas, 600 linhas e 50 colunas. Divida o extrato.');return book;
}
function cell(v:ExcelJS.CellValue):string{if(v===null||v===undefined)return '';if(v instanceof Date)return v.toISOString().slice(0,10);if(typeof v==='object'){if('formula'in v||'sharedFormula'in v)return '[FÓRMULA: substitua por valor]';if('richText'in v)return v.richText.map(x=>x.text).join('');if('text'in v)return v.text;return '[CÉLULA INVÁLIDA]';}return String(v);}
export async function inspectSheet(base64:string){const b=await workbook(base64);return {sheets:b.worksheets.map(s=>({name:s.name,rows:s.rowCount,columns:s.columnCount,preview:Array.from({length:Math.min(s.rowCount,100)},(_,i)=>({line:i+1,cells:Array.from({length:s.columnCount},(_,j)=>cell(s.getCell(i+1,j+1).value))}))}))};}
function amount(v:ExcelJS.CellValue):bigint{
 let raw=cell(v).trim();if(!raw)return 0n;
 if(typeof v==='number'){if(!Number.isFinite(v)||Math.abs(v)>9999999999999)fail('Valor numérico fora do limite.');raw=v.toFixed(2);if(Math.abs(v-Number(raw))>0.000001)fail('Valor com mais de duas casas decimais.');}
 else{raw=raw.replace(/R\$\s*/g,'').replace(/\s/g,'');if(/^\(.*\)$/.test(raw))raw='-'+raw.slice(1,-1);if(raw.includes(','))raw=raw.replace(/\./g,'').replace(',','.');}
 if(!/^[+-]?\d+(\.\d{1,2})?$/.test(raw))fail('Valor inválido; use número ou valor em reais.');
 const [whole,frac='']=raw.replace(/^[+-]/,'').split('.');const n=(BigInt(whole!)*100n+BigInt(frac.padEnd(2,'0')))*(raw.startsWith('-')?-1n:1n);if(n>999999999999999n||n< -999999999999999n)fail('Valor fora do limite.');return n;
}
export async function mappedRows(d:SheetMapping){const b=await workbook(d.base64),s=b.getWorksheet(d.sheet)??fail('Planilha não encontrada.');const rows:ImportedRow[]=[];
 for(let line=d.header+1;line<=s.rowCount;line++){
  if(d.skip.includes(line))continue;const get=(col:number|null)=>col?s.getCell(line,col).value:null;
  if([d.date,d.description,d.amount,d.debit,d.credit,d.identifier].every(c=>cell(get(c))===''))continue;
  const r:ImportedRow={line,external_id:'',date:cell(get(d.date)),title:cell(get(d.description)),direction:'income',amount_minor:'0'};
  try{if(/^saldo(?:\s|$)/i.test(r.title.trim()))fail('Linha de saldo: marque para ignorar.');if(/^\d{2}\/\d{2}\/\d{4}/.test(r.date))r.date=r.date.slice(0,10).split('/').reverse().join('-');if(!day.safeParse(r.date).success)fail('Data inválida.');if(!r.title.trim()||r.title.length>240)fail('Descrição obrigatória, até 240 caracteres.');
   let value:bigint;if(d.amount)value=amount(get(d.amount));else{const debit=amount(get(d.debit)),credit=amount(get(d.credit));if(debit&&credit)fail('Débito e crédito preenchidos na mesma linha.');value=(credit<0n?-credit:credit)-(debit<0n?-debit:debit);}if(!value)fail('Linha sem movimento: valor zero.');r.direction=value>0n?'income':'expense';r.amount_minor=(value<0n?-value:value).toString();const identifier=cell(get(d.identifier));if(identifier.startsWith('[FÓRMULA'))fail('Identificador contém fórmula.');r.external_id=identifier?`xlsx:id:${digest(identifier)}`:`xlsx:row:${digest(JSON.stringify([r.date,r.title,r.direction,r.amount_minor]))}`;
  }catch(e){r.error=(e as Error).message;}rows.push(r);
 }
 if(!rows.length||rows.length>500)fail('Selecione de 1 a 500 movimentos.');return rows;
}
