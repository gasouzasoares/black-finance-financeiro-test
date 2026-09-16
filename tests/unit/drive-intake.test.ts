import {test} from 'node:test';
import assert from 'node:assert/strict';
import {auditFilename,canReadDrive,driveFileKind,fullDriveScope} from '../../packages/domain/src/drive-intake.js';
test('Drive central requires explicit full scope; drive.file is not folder access',()=>{assert.equal(canReadDrive({scope:'https://www.googleapis.com/auth/drive.file'}),false);assert.equal(canReadDrive({scope:fullDriveScope}),true);assert.equal(canReadDrive({}),false);});
test('reviewed filenames preserve cents and extension and remove path/control characters',()=>{const name=auditFilename({date:'2026-08-06',title:'Almoço / Instituto\nTeste',amount:'2394',id:'42',filename:'IMG_1.JPEG'});assert.equal(name,'2026-08-06 - Almoço Instituto Teste - R$ 23,94 - BF42.jpeg');assert.equal(driveFileKind('application/pdf','nota.pdf'),'document');assert.equal(driveFileKind('application/vnd.google-apps.shortcut','atalho'),'unsupported');});
