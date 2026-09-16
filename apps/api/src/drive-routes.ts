import {z} from 'zod';
import type {FastifyInstance,FastifyRequest} from 'fastify';
import {DriveIntake} from '../../../packages/domain/src/drive-intake.js';
import type {Finance,Context} from '../../../packages/domain/src/finance.js';
import {id} from '../../../packages/contracts/src/finance.js';
import {mappingSchema} from '../../../packages/contracts/src/evidence.js';
import {parse} from './finance-routes.js';
const driveId=z.string().regex(/^[\w-]{10,200}$/);
export function driveRoutes(app:FastifyInstance,f:Finance,context:(r:FastifyRequest)=>Promise<Context>){
 const s=new DriveIntake(f),rid=(r:FastifyRequest)=>parse(z.object({id}),r.params).id;
 app.post('/v1/drive/root',async r=>s.root(await context(r),parse(z.object({root:driveId}).strict(),r.body).root));
 app.get('/v1/drive/folders',async r=>s.browse(await context(r),parse(z.object({folder:driveId.optional()}).strict(),r.query).folder));
 app.get('/v1/drive/sources',async r=>s.list(await context(r)));
 app.post('/v1/drive/sources',async r=>s.bind(await context(r),parse(z.object({account_id:id,month:z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/),folder_id:driveId}).strict(),r.body)));
 app.get('/v1/drive/sources/:id/files',async r=>s.files(await context(r),rid(r)));
 app.post('/v1/drive/sources/:id/scan',async r=>s.scan(await context(r),rid(r)));
 app.get('/v1/drive/files/:id/chunk',async r=>s.chunk(await context(r),rid(r),parse(z.object({offset:z.coerce.number().int().min(0).max(20000000)}).strict(),r.query).offset));
 app.post('/v1/drive/files/:id/document',async r=>s.document(await context(r),rid(r),parse(z.object({text:z.string().max(60000),method:z.enum(['pdf-text','ocr','manual']),duration_ms:z.number().int().min(0).max(3600000),checksum:z.string().regex(/^[a-f0-9]{32}$/)}).strict(),r.body)));
 app.post('/v1/drive/files/:id/statement',async r=>s.statement(await context(r),rid(r),parse(mappingSchema,r.body)));
 app.post('/v1/drive/files/:id/ignore',async r=>s.ignore(await context(r),rid(r),parse(z.object({reason:z.string().trim().min(5).max(1000)}).strict(),r.body).reason));
 app.get('/v1/drive/sources/:id/plan',async r=>s.plan(await context(r),rid(r)));
 app.post('/v1/drive/sources/:id/approve',async r=>s.approve(await context(r),rid(r),parse(z.object({hash:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),r.body).hash));
 app.get('/v1/drive/sources/:id/jobs',async r=>s.jobs(await context(r),rid(r)));
 app.post('/v1/drive/jobs/:id/apply',async r=>s.rename(await context(r),rid(r)));
}
