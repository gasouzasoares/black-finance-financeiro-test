import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCsv,parseOfx,occurrenceDate} from '../../packages/domain/src/import-parser.js';

test('CSV preserves exact cents, quoted delimiters and validation by line',()=>{
 const rows=parseCsv('data;descricao;valor;id\n31/01/2026;"Contrato; revisão";1.234,56;a\n2026-02-31;Data inválida;10,00;b\n2026-02-28;"Duas ""aspas""";-0,09;c');
 assert.equal(rows[0]!.amount_minor,'123456');assert.equal(rows[0]!.title,'Contrato; revisão');
 assert.ok(rows[1]!.error);assert.equal(rows[2]!.direction,'expense');assert.equal(rows[2]!.amount_minor,'9');
 assert.throws(()=>parseCsv('data;descricao;valor\n2026-01-01;"quebra;10'));
 assert.equal(parseCsv('data;descricao;valor\n2026-01-01;A;0')[0]!.error?.includes('zero'),true);
});
test('OFX supports SGML leaf tags, uses FITID and rejects XML entities and currency',()=>{
 const source='<OFX><CURDEF>BRL\n<BANKACCTFROM><BANKID>001\n<ACCTID>123\n<ACCTTYPE>CHECKING\n</BANKACCTFROM><BANKTRANLIST><STMTTRN><DTPOSTED>20260131120000[-3:BRT]\n<TRNAMT>-12.34\n<FITID>ABC\n<MEMO>Conta &amp; serviços\n</STMTTRN></BANKTRANLIST></OFX>';
 const row=parseOfx(source).rows[0]!;assert.equal(row.date,'2026-01-31');assert.equal(row.amount_minor,'1234');assert.equal(row.title,'Conta & serviços');assert.equal(row.direction,'expense');
 assert.equal(parseOfx(source.replace('Conta &amp; serviços','Outra descrição')).rows[0]!.external_id,row.external_id);
 assert.throws(()=>parseOfx(source.replace('BRL','USD')));assert.throws(()=>parseOfx('<!DOCTYPE x>'+source));
});
test('recurrences retain original month anchor through short months and leap years',()=>{
 assert.equal(occurrenceDate('2026-01-31',1,'monthly'),'2026-02-28');assert.equal(occurrenceDate('2026-01-31',2,'monthly'),'2026-03-31');
 assert.equal(occurrenceDate('2024-02-29',1,'yearly'),'2025-02-28');assert.equal(occurrenceDate('2024-02-29',4,'yearly'),'2028-02-29');
 assert.equal(occurrenceDate('2026-12-30',1,'weekly'),'2027-01-06');
});
