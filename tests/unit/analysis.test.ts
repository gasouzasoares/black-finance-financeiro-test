import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalize,specialMovement} from '../../packages/domain/src/analysis.js';
import {excelAmount} from '../../packages/domain/src/accountant.js';
test('analysis normalization flags investments and exports large exact money as text',()=>{assert.equal(normalize('  Alimentação — CFA  '),'alimentacao cfa');assert.equal(specialMovement('Resgate de aplicação'),true);assert.equal(specialMovement('PIX recebido de parceiro'),false);assert.equal(excelAmount('12345'),123.45);assert.equal(excelAmount('10000000000000001'),'100000000000000.01');assert.equal(excelAmount('-10000000000000001'),'-100000000000000.01');});
