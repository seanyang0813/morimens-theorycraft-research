import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveCardCost} from '../engine/card-cost.mjs';
test('cost precedence matches original card methods and variable resolver',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-card-cost.json',import.meta.url)));
  for(const {input,expected} of evidence.fixtures){const result=resolveCardCost(input);for(const key of Object.keys(expected))assert.equal(result[key],expected[key],JSON.stringify(input));}
});
