import {test} from 'node:test';
import assert from 'node:assert/strict';
import {auditFilename,driveFileKind} from '../../packages/domain/src/drive-intake.js';
import {driveFolderQuery,driveChunkQuery} from '../../apps/api/src/drive-routes.js';
test('Drive query parsing accepts Vercel routing metadata without passing it to Google',()=>{assert.deepEqual(driveFolderQuery.parse({path:'drive/folders'}),{});assert.deepEqual(driveChunkQuery.parse({path:'drive/files/1/chunk',offset:'750000'}),{offset:750000});assert.throws(()=>driveChunkQuery.parse({offset:-1}));});
test('reviewed filenames preserve cents and extension and remove path/control characters',()=>{const name=auditFilename({date:'2026-08-06',title:'Almoço / Instituto\nTeste',amount:'2394',id:'42',filename:'IMG_1.JPEG'});assert.equal(name,'2026-08-06 - Almoço Instituto Teste - R$ 23,94 - BF42.jpeg');assert.equal(driveFileKind('application/pdf','nota.pdf'),'document');assert.equal(driveFileKind('application/vnd.google-apps.shortcut','atalho'),'unsupported');});
