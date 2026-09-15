import {z} from 'zod';
import {day,id,money,entrySchema,listSchema} from './finance.js';

export const invoiceSchema=z.object({
 account_id:id,party_id:id,title:z.string().trim().min(1).max(240),issued_on:day,due_on:day,
 category_id:id.nullable().default(null),notes:z.string().max(5000).default(''),
 discount_minor:z.string().regex(/^(0|[1-9]\d{0,14})$/).default('0'),
 items:z.array(z.object({description:z.string().trim().min(1).max(240),quantity:z.number().int().min(1).max(100000),unit_minor:money}).strict()).min(1).max(100)
}).strict().refine(d=>d.due_on>=d.issued_on,{message:'O vencimento não pode anteceder a emissão.',path:['due_on']}).refine(d=>{
 const total=d.items.reduce((s,i)=>s+BigInt(i.quantity)*BigInt(i.unit_minor),0n)-BigInt(d.discount_minor);
 return total>0n&&total<=999999999999999n;
},{message:'O total deve ser positivo e estar dentro do limite.',path:['discount_minor']});
export const recurrenceSchema=z.object({entry:entrySchema,frequency:z.enum(['weekly','monthly','quarterly','yearly']),start_on:day,end_on:day}).strict().refine(d=>d.end_on>=d.start_on&&Date.parse(d.end_on)-Date.parse(d.start_on)<=366*86400000*10,{message:'Escolha um intervalo de até dez anos.'});
export const reportSchema=listSchema.and(z.object({basis:z.enum(['competence','cash']).default('competence')}));
export const importSchema=z.object({account_id:id,kind:z.enum(['csv','ofx']),filename:z.string().trim().min(1).max(200),content:z.string().min(1).max(700000)}).strict();
export type InvoiceInput=z.infer<typeof invoiceSchema>;
export type RecurrenceInput=z.infer<typeof recurrenceSchema>;
