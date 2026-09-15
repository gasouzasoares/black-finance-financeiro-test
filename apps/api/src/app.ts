import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { randomUUID } from 'node:crypto';
import { AppError, type Me } from '../../../packages/contracts/src/index.js';
import {Finance} from '../../../packages/domain/src/finance.js';
import {financeRoutes} from './finance-routes.js';
import type {FastifyRequest} from 'fastify';

export type Dependencies = {
  verify: (token: string) => Promise<string>;
  findUser: (id: string) => Promise<(Omit<Me, 'status'> & { status: string }) | undefined>;
  ping: () => Promise<void>;
  publicConfig: { supabaseUrl: string; supabasePublishableKey: string;authMode?:'cookie' };
  logger?: boolean;
  finance?: Finance;
  sessionUser?: (req:FastifyRequest)=>Promise<string | undefined>;
};

export async function buildApp(deps: Dependencies) {
  const app = Fastify({
    logger: deps.logger === false ? false : {
      level: 'info', redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
      serializers: { req: (req:{method:string;url:string}) => ({ method: req.method, url: req.url.split('?')[0] }) },
    },
    // Only Caddy can reach this container; trust exactly the last proxy hop.
    trustProxy: (_address, hop) => hop === 0, genReqId: () => randomUUID(), bodyLimit: 1048576,
  });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  app.addHook('onRequest', async (_req, reply) => { reply.header('Cache-Control', 'no-store'); });
  app.addHook('onSend', async (req, reply) => { reply.header('X-Request-Id', req.id); });
  app.setErrorHandler((error, req, reply) => {
    const typed = error as Error & { statusCode?: number };
    const status = error instanceof AppError ? error.statusCode :
      typed.statusCode && [400, 413, 415, 429].includes(typed.statusCode) ? typed.statusCode : 500;
    if (status >= 500) req.log.error({ code: 'INTERNAL_ERROR', request_id: req.id }, 'Falha interna');
    return reply.code(status).send({
      code: error instanceof AppError ? error.code : status === 429 ? 'RATE_LIMITED' : status < 500 ? 'INVALID_REQUEST' : 'INTERNAL_ERROR',
      message: error instanceof AppError ? error.message : status === 429 ? 'Aguarde antes de tentar novamente.' : status < 500 ? 'Requisição inválida.' : 'Não foi possível concluir a operação.',
      field_errors: error instanceof AppError ? error.fieldErrors : {}, request_id: req.id,
    });
  });
  app.setNotFoundHandler((req, reply) => reply.code(404).send({
    code: 'NOT_FOUND', message: 'Recurso não encontrado.', field_errors: {}, request_id: req.id,
  }));
  app.get('/live', async () => ({ status: 'alive' }));
  app.get('/health', async () => {
    try { await deps.ping(); } catch { throw new AppError(503, 'NOT_READY', 'Serviço temporariamente indisponível.'); }
    return { status: 'ok' };
  });
  app.get('/v1/config', async () => deps.publicConfig);
  const authenticate=async(req:FastifyRequest)=>{
    if(deps.sessionUser){const id=await deps.sessionUser(req);if(!id)throw new AppError(401,'AUTH_REQUIRED','Entre para continuar.');return id;}
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new AppError(401, 'AUTH_REQUIRED', 'Entre para continuar.');
    let id: string;
    try { id = await deps.verify(header.slice(7)); }
    catch { throw new AppError(401, 'INVALID_TOKEN', 'Sessão inválida ou expirada.'); }
    return id;
  };
  app.get('/v1/me', async req => {
    const user = await deps.findUser(await authenticate(req));
    if (!user || user.status !== 'active') throw new AppError(403, 'ACCESS_REVOKED', 'Seu acesso à organização não está ativo.');
    return user;
  });
  if(deps.finance)await financeRoutes(app,deps.finance,authenticate);
  return app;
}
