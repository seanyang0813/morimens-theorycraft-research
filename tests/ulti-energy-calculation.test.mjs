import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateNoCardUltiEnergy} from '../engine/ulti-energy-calculation.mjs';
test('ultimate-energy calculation and property reads match 144 connected original executions',()=>{
 const fixtures=JSON.parse(readFileSync(new URL('./synthetic/original-ulti-energy.json',import.meta.url))).fixtures;
 assert.equal(fixtures.length,144);
 for(const {input,expected} of fixtures){const {value,propertyReads}=calculateNoCardUltiEnergy(input);assert.deepEqual({value,propertyReads},expected);}
 assert.ok(fixtures.some(r=>r.expected.value<0));
});
test('missing property evidence is rejected',()=>{
 assert.throws(()=>calculateNoCardUltiEnergy({base:10,dimension:0,properties:{}}),/Explicit/);
});
