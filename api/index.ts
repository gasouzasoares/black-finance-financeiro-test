import type {IncomingMessage,ServerResponse} from 'node:http';
import {toNodeHandler,fromNodeHeaders} from 'better-auth/node';
import {attachDatabasePool} from '@vercel/functions';
import {createPool,assertRuntimeRole} from '../packages/domain/src/db.js';
import {Finance} from '../packages/domain/src/finance.js';
import {makeAuth} from '../apps/api/src/cloud-auth.js';
import {buildApp} from '../apps/api/src/app.js';
const pool=createPool(process.env.APP_DATABASE_URL!,false,3,15000);attachDatabasePool(pool);
async function initialize(){
 await assertRuntimeRole(pool);
 const auth=makeAuth(pool,process.env.BETTER_AUTH_SECRET!,process.env.BETTER_AUTH_URL!);
 const app=await buildApp({finance:new Finance(pool),verify:async()=>{throw new Error('Bearer disabled in cloud');},sessionUser:async req=>{
 const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});return session?.user.id;
},findUser:async id=>(await pool.query('SELECT id,email,display_name,status FROM app.users WHERE id=$1',[id])).rows[0],ping:async()=>{await pool.query('SELECT 1');},publicConfig:{supabaseUrl:'https://unused.invalid',supabasePublishableKey:'unused',authMode:'cookie'}});await app.ready();return {app,auth};}
let runtime:ReturnType<typeof initialize>|undefined;
// Network activity starts within an invocation; a failed cold start remains retryable.
function getRuntime(){return runtime??=initialize().catch(error=>{runtime=undefined;throw error;});}
export default async function handler(req:IncomingMessage,res:ServerResponse){
 try{
  const {app,auth}=await getRuntime();
  if(req.url?.startsWith('/api/auth/'))return await toNodeHandler(auth)(req,res);
  // Reject cross-origin mutations; cookie authentication must not permit CSRF.
  if(!['GET','HEAD','OPTIONS'].includes(req.method??'GET')){const origin=req.headers.origin;if(origin&&origin!==process.env.BETTER_AUTH_URL){res.writeHead(403,{'Content-Type':'application/json'});res.end(JSON.stringify({code:'INVALID_ORIGIN',message:'Origem inválida.'}));return;}if(!String(req.headers['content-type']??'').startsWith('application/json')){res.writeHead(415);res.end();return;}}
  await new Promise<void>((resolve,reject)=>{res.once('finish',resolve);res.once('close',resolve);res.once('error',reject);app.server.emit('request',req,res);});
 }catch(error){
  const code=(error as {code?:unknown})?.code;
  console.error(JSON.stringify({event:'cloud_request_failed',code:typeof code==='string'&&/^[A-Z0-9_]{1,40}$/.test(code)?code:'INITIALIZATION_FAILED'}));
  if(!res.headersSent){res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({code:'NOT_READY',message:'Serviço temporariamente indisponível.'}));}else res.end();
 }
}
