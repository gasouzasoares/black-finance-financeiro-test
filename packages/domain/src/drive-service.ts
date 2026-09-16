import {createHash,createPrivateKey,sign} from 'node:crypto';
import {AppError} from '../../contracts/src/index.js';

export const receiptRoot='12LPSzm_0tyb0EorYq2d-zJqCSzD8cKWL';
const scope='https://www.googleapis.com/auth/drive.readonly';
const endpoint='https://oauth2.googleapis.com/token';
type Credentials={client_email:string;private_key:string;type:string};
const unavailable=():never=>{throw new AppError(409,'DRIVE_SETUP','A leitura da pasta Comprovantes aguarda a configuração da conta técnica e o compartilhamento da pasta como leitor.');};
function credentials():Credentials {
 try {
  const c=JSON.parse(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON??'') as Credentials;
  if(c.type!=='service_account'||!c.client_email?.endsWith('.iam.gserviceaccount.com')||!c.private_key) return unavailable();
  if(createPrivateKey(c.private_key).asymmetricKeyType!=='rsa') return unavailable();
  return c;
 } catch {return unavailable();}
}
export function driveServiceConfigured(){try{credentials();return true;}catch{return false;}}
export function assertReceiptRoot(root:string){if(root!==receiptRoot)throw new AppError(403,'DRIVE_ROOT','O acesso está limitado à pasta Comprovantes configurada no servidor.');}
export function serviceAssertion(c:Credentials,now:number){
 const encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const input=encode({alg:'RS256',typ:'JWT'})+'.'+encode({iss:c.client_email,scope,aud:endpoint,iat:now,exp:now+3600});
 return input+'.'+sign('RSA-SHA256',Buffer.from(input),c.private_key).toString('base64url');
}
// Cache only short-lived tokens in server memory; key changes invalidate the cache.
export class DriveService {
 private cached?:{fingerprint:string;token:string;expires:number};
 constructor(private request:typeof fetch=fetch){}
 async access(){
  const c=credentials(),fingerprint=createHash('sha256').update(c.client_email+c.private_key).digest('hex');
  if(this.cached?.fingerprint===fingerprint&&this.cached.expires>Date.now()+60000)return this.cached.token;
  const r=await this.request(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:serviceAssertion(c,Math.floor(Date.now()/1000))}),signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new AppError(409,'DRIVE_SETUP','Não foi possível autenticar a conta técnica do Drive. Confira sua configuração no servidor.');
  const result=await r.json() as {access_token?:string;expires_in?:number};
  if(!result.access_token||!Number.isFinite(result.expires_in)||result.expires_in!<=0)throw new AppError(503,'DRIVE_SETUP','Resposta de autenticação inválida do Google.');
  this.cached={fingerprint,token:result.access_token,expires:Date.now()+result.expires_in!*1000};
  return this.cached.token;
 }
}
