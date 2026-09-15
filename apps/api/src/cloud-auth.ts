import {betterAuth} from 'better-auth';
import type pg from 'pg';
export function makeAuth(pool:pg.Pool,secret:string,url:string,provision=false){return betterAuth({
 database:pool,secret,baseURL:url,basePath:'/api/auth',trustedOrigins:[url],
 emailAndPassword:{enabled:true,disableSignUp:!provision,minPasswordLength:12},
 advanced:{database:{generateId:'uuid'}},
 user:{modelName:'auth_user'},session:{modelName:'auth_session',expiresIn:60*60*8,updateAge:60*30,cookieCache:{enabled:false}},
 account:{modelName:'auth_account'},verification:{modelName:'auth_verification'},
 rateLimit:{enabled:true,storage:'database',modelName:'auth_rate_limit',window:60,max:60,customRules:{'/sign-in/email':{window:60,max:10}}},
 logger:{level:'error'},
 });}
