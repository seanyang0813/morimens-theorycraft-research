import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {consumeEnergy} from '../engine/energy-payment.mjs';
test('reported payment and actual resource loss match original connected methods',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-energy-payment.json',import.meta.url)));
  for(const {input,expected} of evidence.fixtures){const result=consumeEnergy(input);for(const key of Object.keys(expected))assert.deepEqual(result[key],expected[key]);}
});
