import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,verify} from 'node:crypto';
import {DriveService,serviceAssertion,assertReceiptRoot,receiptRoot,driveServiceConfigured} from '../../packages/domain/src/drive-service.js';

test('service assertions are signed, read-only and do not impersonate a user',()=>{
 const pair=generateKeyPairSync('rsa',{modulusLength:2048});
 const c={type:'service_account',client_email:'test@fixture.iam.gserviceaccount.com',private_key:pair.privateKey.export({format:'pem',type:'pkcs8'}).toString()};
 const jwt=serviceAssertion(c,100),[header,payload,signature]=jwt.split('.');
 assert.ok(verify('RSA-SHA256',Buffer.from(header+'.'+payload),pair.publicKey,Buffer.from(signature!,'base64url')));
 assert.deepEqual(JSON.parse(Buffer.from(payload!,'base64url').toString()),{iss:c.client_email,scope:'https://www.googleapis.com/auth/drive.readonly',aud:'https://oauth2.googleapis.com/token',iat:100,exp:3700});
 assert.doesNotThrow(()=>assertReceiptRoot(receiptRoot));assert.throws(()=>assertReceiptRoot('another-folder'),/limitado/);
});
test('service tokens are cached; missing credentials fail closed without personal OAuth fallback',async()=>{
 const prior=process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON;
 try {
  delete process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON;
  assert.equal(driveServiceConfigured(),false);
  let requests=0;const service=new DriveService(async()=>{requests++;return Response.json({access_token:'test-only',expires_in:3600});});
  await assert.rejects(()=>service.access(),/conta técnica/);assert.equal(requests,0);
  process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON=JSON.stringify({type:'service_account',client_email:'test@fixture.iam.gserviceaccount.com',private_key:generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({format:'pem',type:'pkcs8'})});
  assert.equal(driveServiceConfigured(),true);assert.equal(await service.access(),'test-only');await service.access();assert.equal(requests,1);
  delete process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON;await assert.rejects(()=>service.access());assert.equal(requests,1);
 }finally{if(prior)process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON=prior;else delete process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON;}
});
