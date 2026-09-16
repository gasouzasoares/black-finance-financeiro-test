import {z} from 'zod';
import {driveRoutes} from './drive-routes.js';
import type {FastifyInstance,FastifyRequest} from 'fastify';
import type {Finance,Context} from '../../../packages/domain/src/finance.js';
import {GoogleIntegration} from '../../../packages/domain/src/google.js';
import {day,id} from '../../../packages/contracts/src/finance.js';
import {parse} from './finance-routes.js';
const windowSchema=z.object({from:day,to:day}).refine(d=>d.to>=d.from&&Date.parse(d.to)-Date.parse(d.from)<=31*86400000,{message:'Consulte até 31 dias por vez.'});
export async function googleRoutes(app:FastifyInstance,f:Finance,context:(r:FastifyRequest)=>Promise<Context>){
 driveRoutes(app,f,context);
 const google=new GoogleIntegration(f);
 app.get('/v1/integrations/google',async r=>google.status(await context(r)));
 app.post('/v1/integrations/google/connect',async r=>google.start(await context(r),parse(z.object({central:z.boolean().default(false)}).strict(),r.body??{}).central));
 app.get('/v1/integrations/google/callback',async(r,reply)=>{const d=parse(z.object({state:z.string().min(20).max(200),code:z.string().min(1).max(4096)}),r.query);await google.complete(await context(r),d.state,d.code);return reply.redirect('/?google=connected');});
 app.get('/v1/integrations/google/choices',async r=>google.choices(await context(r)));
 app.patch('/v1/integrations/google/settings',async r=>google.settings(await context(r),parse(z.object({calendars:z.array(z.string().max(500)).max(5),folder:z.string().regex(/^[\w-]+$/).nullable()}).strict(),r.body)));
 app.post('/v1/integrations/google/folders',async r=>google.folder(await context(r),parse(z.object({name:z.string().trim().min(1).max(200)}).strict(),r.body).name));
 app.post('/v1/integrations/google/disconnect',async r=>google.disconnect(await context(r)));
 app.post('/v1/integrations/google/sync',async r=>{const d=parse(windowSchema,r.body);return google.sync(await context(r),d.from,d.to);});
 app.get('/v1/integrations/google/events',async r=>{const d=parse(windowSchema,r.query);return google.events(await context(r),d.from,d.to);});
 app.post('/v1/integrations/google/documents/:id',async r=>google.copy(await context(r),parse(id,(r.params as {id:string}).id)));
}
