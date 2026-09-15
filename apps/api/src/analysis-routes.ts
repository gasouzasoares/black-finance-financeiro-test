import {Accountant} from '../../../packages/domain/src/accountant.js';
import {accountabilitySchema} from '../../../packages/contracts/src/evidence.js';
import {mappingAccountSchema} from '../../../packages/contracts/src/analysis.js';
import {z} from 'zod';
import type {FastifyInstance,FastifyRequest} from 'fastify';
import {Analysis} from '../../../packages/domain/src/analysis.js';
import type {Finance,Context} from '../../../packages/domain/src/finance.js';
import {id} from '../../../packages/contracts/src/finance.js';
import {proposalReviewSchema,plannedActivitySchema} from '../../../packages/contracts/src/analysis.js';
import {parse} from './finance-routes.js';
export function analysisRoutes(app:FastifyInstance,f:Finance,context:(r:FastifyRequest)=>Promise<Context>){
 const accountant=new Accountant(f);
 app.get('/v1/reports/accountant.xlsx',async r=>accountant.workbook(await context(r),parse(accountabilitySchema,r.query)));
 app.get('/v1/reports/accounting-mappings',async r=>accountant.mappings(await context(r)));
 app.patch('/v1/reports/accounting-mappings',async r=>accountant.saveMapping(await context(r),parse(mappingAccountSchema,r.body)));
 const service=new Analysis(f),params=(r:FastifyRequest)=>parse(z.object({batch:id,id:id.optional()}),r.params),reason=z.object({reason:z.string().trim().min(3).max(1000)}).strict();
 app.get('/v1/imports/:batch/analysis',async r=>service.list(await context(r),params(r).batch));
 app.post('/v1/imports/:batch/analysis',async r=>service.analyze(await context(r),params(r).batch,parse(z.object({row_id:id}).strict(),r.body).row_id));
 app.get('/v1/imports/:batch/analysis/:id',async r=>service.detail(await context(r),params(r).batch,params(r).id!));
 app.patch('/v1/imports/:batch/analysis/:id',async r=>{const d=parse(proposalReviewSchema,r.body);return service.review(await context(r),params(r).batch,params(r).id!,d.draft,d.reason);});
 app.post('/v1/imports/:batch/analysis/:id/approve',async r=>service.approve(await context(r),params(r).batch,params(r).id!,parse(reason,r.body).reason));
 app.post('/v1/imports/:batch/analysis/:id/reject',async r=>service.reject(await context(r),params(r).batch,params(r).id!,parse(reason,r.body).reason));
 app.post('/v1/imports/:batch/analysis/:id/restart',async r=>service.restart(await context(r),params(r).batch,params(r).id!));
 app.get('/v1/context/activities',async r=>service.activities(await context(r)));
 app.post('/v1/context/activities',async r=>service.saveActivity(await context(r),parse(plannedActivitySchema,r.body)));
 app.patch('/v1/context/activities/:id',async r=>service.saveActivity(await context(r),parse(plannedActivitySchema,r.body),parse(z.object({id}),r.params).id));
 app.get('/v1/context/rules',async r=>service.rules(await context(r)));
 app.post('/v1/context/rules/:id/disable',async r=>service.disableRule(await context(r),parse(z.object({id}),r.params).id));
}
