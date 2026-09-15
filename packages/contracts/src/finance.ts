import { z } from 'zod';
export const id = z.string().regex(/^[1-9]\d{0,17}$/);
export const money = z.string().regex(/^[1-9]\d{0,14}$/, 'Informe um valor positivo em centavos.');
export const signedMoney = z.string().regex(/^-?(0|[1-9]\d{0,14})$/);
export const day = z.iso.date().refine(d=>d>='1900-01-01' && d<='2200-12-31');
export const groups = ['revenue','deductions','fixed','variable','people','taxes','unclassified'] as const;
export const directions = ['income','expense'] as const;
export const resources = ['entries','notifications','dashboard','reports','parties','categories','cost-centers','accounts','templates','users','imports','reconciliation','exports','organization','billing','fiscal','search','invoices','labels'] as const;
export const actions = ['view','create','update','cancel','settle','reverse','transfer','balances','manage'] as const;
export const permission = z.string().refine(s => resources.some(r=>actions.some(a=>s===`${r}:${a}`)));
export const policySchema = z.object({is_owner:z.boolean().default(false),permissions:z.array(permission).max(171),legal_entity_ids:z.array(id).max(1000),account_ids:z.array(id).max(1000),directions:z.array(z.enum(directions)),groups:z.array(z.enum(groups))}).strict();
export type Policy = z.infer<typeof policySchema>;
export function validCnpj(input:string) {
 const s=input.replace(/[.\-/\s]/g,'').toUpperCase();
 if(!/^[A-Z0-9]{12}\d{2}$/.test(s)||/^(.)\1+$/.test(s)) return false;
 let base=s.slice(0,12);
 for(let round=0;round<2;round++) { let sum=0; for(let i=base.length-1,w=2;i>=0;i--,w=w===9?2:w+1)sum+=(base.charCodeAt(i)-48)*w; const rem=sum%11; base+=String(rem<2?0:11-rem); }
 return base===s;
}
export const name = z.string().trim().min(1).max(200);
export const legalEntitySchema = z.object({name,cnpj:z.string().transform(s=>s.replace(/[.\-/\s]/g,'').toUpperCase()).refine(validCnpj,'CNPJ inválido.'),status:z.enum(['active','archived']).default('active')}).strict();
export const accountSchema = z.object({legal_entity_id:id,name,kind:z.enum(['bank','cash','other']),opening_on:day,opening_minor:signedMoney.default('0'),is_default:z.boolean().default(false)}).strict();
export const allocationSchema=z.object({amount_minor:money,category_id:id.nullable().default(null),cost_center_id:id.nullable().default(null)}).strict();
export const entrySchema=z.object({account_id:id,party_id:id.nullable().default(null),direction:z.enum(directions),title:z.string().trim().min(1).max(240),notes:z.string().max(5000).default(''),amount_minor:money,due_on:day,competence_on:day,allocations:z.array(allocationSchema).min(1).max(100),label_ids:z.array(id).max(30).default([])}).strict().refine(v=>v.allocations.reduce((s,a)=>s+BigInt(a.amount_minor),0n)===BigInt(v.amount_minor),{message:'A soma do rateio deve ser igual ao valor total.',path:['allocations']});
export type EntryInput=z.infer<typeof entrySchema>;
export const settleSchema=z.object({settled_on:day,reason:z.string().max(500).default('')}).strict();
export const reverseSchema=z.object({effective_on:day,reason:z.string().trim().min(3).max(500)}).strict();
export const transferSchema=z.object({source_account_id:id,destination_account_id:id,amount_minor:money,effective_on:day,reason:z.string().max(500).default('')}).strict().refine(v=>v.source_account_id!==v.destination_account_id,{message:'Escolha contas diferentes.'});
export const listSchema=z.object({from:day,to:day,account_id:id.optional(),legal_entity_id:id.optional(),direction:z.enum(directions).optional(),status:z.enum(['open','settled','cancelled']).optional(),q:z.string().max(100).optional(),cursor:z.string().max(200).optional(),limit:z.coerce.number().int().min(1).max(200).default(50)}).refine(v=>v.to>=v.from && Date.parse(v.to)-Date.parse(v.from)<=366*86400000,{message:'Escolha um período de até 12 meses.'});
export type ListQuery=z.infer<typeof listSchema>;
export const catalogSchemas={
 parties:z.object({name,document:z.string().max(30).default(''),email:z.union([z.email(),z.literal('')]).default(''),phone:z.string().max(40).default(''),status:z.enum(['active','archived']).default('active')}).strict(),
 categories:z.object({name,direction:z.enum(directions),reporting_group:z.enum(groups),status:z.enum(['active','archived']).default('active')}).strict(),
 'cost-centers':z.object({name,status:z.enum(['active','archived']).default('active')}).strict(),
 labels:z.object({name:name.max(80),status:z.enum(['active','archived']).default('active')}).strict()
};
export type Catalog=keyof typeof catalogSchemas;
export const invitationSchema=z.object({email:z.email().transform(v=>v.toLowerCase()),display_name:name,policy:policySchema}).strict();
