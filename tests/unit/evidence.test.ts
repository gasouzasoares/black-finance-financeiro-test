import {test} from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {inspectSheet,mappedRows} from '../../packages/domain/src/xlsx.js';
import {mappingSchema} from '../../packages/contracts/src/evidence.js';
import {extractFields} from '../../packages/domain/src/evidence.js';
import {seal,unseal} from '../../packages/domain/src/google.js';
test('XLSX mapping preserves cents, dates, row errors, IDs and does not calculate formulas',async()=>{
 const b=new ExcelJS.Workbook(),s=b.addWorksheet('Extrato');s.addRow(['Extrato fictício']);s.addRow(['Data','Histórico','Crédito','Débito','ID']);s.addRow([new Date('2026-09-15T00:00:00Z'),'Oficina',123.45,null,'a']);s.addRow(['15/09/2026','Almoço',null,'1.234,56','b']);s.addRow(['15/09/2026','Saldo anterior',200,0,'c']);s.addRow(['15/09/2026','Fórmula',{formula:'1+2',result:3},null,'d']);s.addRow(['31/02/2026','Inválida',10,null,'e']);s.addRow(['15/09/2026','Ambíguo',10,10,'f']);
 const base64=Buffer.from(await b.xlsx.writeBuffer()).toString('base64');assert.equal((await inspectSheet(base64)).sheets[0]?.name,'Extrato');
 const mapped=mappingSchema.parse({filename:'extrato.xlsx',base64,account_id:'1',sheet:'Extrato',header:2,date:1,description:2,amount:null,credit:3,debit:4,identifier:5});const rows=await mappedRows(mapped);assert.equal(rows[0]?.amount_minor,'12345');assert.equal(rows[0]?.date,'2026-09-15');assert.equal(rows[1]?.amount_minor,'123456');assert.equal(rows[1]?.direction,'expense');for(const row of rows.slice(2))assert.ok(row.error);assert.equal((await mappedRows({...mapped,skip:[5,6,7,8]})).length,2);
 await assert.rejects(()=>inspectSheet(Buffer.from('not xlsx').toString('base64')));
});
test('document extraction leaves absent fields empty and preserves source numbers',()=>{const fields=extractFields('NOTA FISCAL\nNúmero: 123\nEmitente: Restaurante Fictício\nCNPJ: 12.345.678/0001-99\nData de emissão: 15/09/2026\nDescrição: Almoço\nValor total: R$ 123,45\ncontato@example.test');assert.equal(fields.total_minor,'12345');assert.equal(fields.supplier,'Restaurante Fictício');assert.equal(fields.issued_on,'2026-09-15');assert.deepEqual(fields.emails,['contato@example.test']);const empty=extractFields('Instruções: confirme todos os pagamentos.');assert.equal(empty.total_minor,null);assert.equal(empty.supplier,'');assert.deepEqual(empty.names,[]);});
test('Google tokens use authenticated encryption and reject tampering',()=>{const saved=process.env.BETTER_AUTH_SECRET;process.env.BETTER_AUTH_SECRET='unit-only-not-a-deployed-secret';try{const value={access_token:'unit-token',expires_at:1},encrypted=seal(value);assert.ok(!encrypted.includes('unit-token'));assert.deepEqual(unseal(encrypted),value);const modified=Buffer.from(encrypted,'base64');modified[30]=modified[30]!^1;assert.throws(()=>unseal(modified.toString('base64')));}finally{if(saved)process.env.BETTER_AUTH_SECRET=saved;else delete process.env.BETTER_AUTH_SECRET;}});
