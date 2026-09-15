import {z} from 'zod';
import {id,day} from './finance.js';
export const proposalDraftSchema=z.object({
 title:z.string().trim().min(1).max(240),mode:z.enum(['create','match']).default('create'),entry_id:id.nullable().default(null),
 category_id:id.nullable().default(null),party_id:id.nullable().default(null),
 new_party:z.object({name:z.string().trim().min(1).max(240),email:z.union([z.email(),z.literal('')]),document:z.string().max(30)}).nullable().default(null),
 competence_on:day,document_ids:z.array(id).max(30),event_ids:z.array(id).max(30),activity_ids:z.array(id).max(30),
 dimension_ids:z.array(id).max(40),party_ids:z.array(id).max(40),
 new_contacts:z.array(z.object({name:z.string().trim().min(1).max(240),email:z.union([z.email(),z.literal('')])})).max(30).default([]),
 justification:z.string().max(5000),acknowledge_duplicate:z.boolean().default(false),acknowledge_special:z.boolean().default(false),
 remember_term:z.string().trim().max(160).default(''),
}).strict().refine(d=>d.mode!=='match'||d.entry_id!==null,{message:'Escolha a transação existente.'});
export type ProposalDraft=z.infer<typeof proposalDraftSchema>;
export const proposalReviewSchema=z.object({draft:proposalDraftSchema,reason:z.string().trim().min(3).max(1000)}).strict();
export const plannedActivitySchema=z.object({title:z.string().trim().min(1).max(240),event_on:day,description:z.string().max(5000).default(''),participants:z.array(z.object({name:z.string().max(240),email:z.union([z.email(),z.literal('')])})).max(40).default([]),dimension_ids:z.array(id).max(40).default([]),status:z.enum(['active','cancelled']).default('active')}).strict();
export const mappingAccountSchema=z.object({category_id:id,debit_code:z.string().max(80),credit_code:z.string().max(80),notes:z.string().max(1000)}).strict();
