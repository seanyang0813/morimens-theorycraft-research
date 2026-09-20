import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateUltiEnergy} from '../engine/ulti-energy-calculation.mjs';
const fixtures=JSON.parse(readFileSync(new URL('./synthetic/original-card-ulti-energy.json',import.meta.url))).fixtures;
test('card bonuses, eligibility and duplicate tag factors match 144 connected original cases',()=>{
 assert.equal(fixtures.length,144);
 for(const {input,expected} of fixtures){const {value,propertyReads}=calculateUltiEnergy(input);assert.deepEqual({value,propertyReads},expected);}
});
test('duplicate tags multiply repeatedly; missing eligible mapping or property fails explicitly',()=>{
 const v=JSON.parse(JSON.stringify(fixtures.find(f=>f.input.casterEligible&&f.input.skillTags.length===2&&f.input.skillTags[0]===f.input.skillTags[1]).input));
 assert.equal(calculateUltiEnergy(v).trace.tagFactor,1.5625);
 v.skillTags=['Unknown'];assert.throws(()=>calculateUltiEnergy(v),/mapping/);
 v.skillTags=[];delete v.properties.ulti_energy_per;assert.throws(()=>calculateUltiEnergy(v),/property/);
});
