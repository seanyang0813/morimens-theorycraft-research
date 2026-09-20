import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gainUltiEnergy} from '../engine/ulti-energy-gain.mjs';
const fixtures=JSON.parse(readFileSync(new URL('./synthetic/original-ulti-energy-gain.json',import.meta.url))).fixtures;
test('stored gain, caps, return values and callbacks match 252 connected original cases',()=>{
 assert.equal(fixtures.length,252);
 for(const {input,expected} of fixtures)assert.deepEqual(gainUltiEnergy(input),expected);
});
test('pre-storage cast value is distinct from stored gain near the cap',()=>{
 const v={energy:99.5,request:0.1,maximumProperties:{ulti_energy_max:100,ulti_energy_cost_per:0,ulti_energy_cost_flat:0,ulti_energy_max_per:0},ignoreMax:false};
 const r=gainUltiEnergy(v);assert.equal(r.castValue,1);assert.equal(r.energyGained,0.5);assert.equal(r.returned,100);
 assert.equal(gainUltiEnergy({...v,ignoreMax:true}).energyAfter,100.5);
 assert.throws(()=>gainUltiEnergy({...v,maximumProperties:{}}),/Explicit/);
});

test('incoming source castValue survives original gain/storage even when zero or no gain occurs',()=>{
 const f=JSON.parse(readFileSync(new URL('./synthetic/original-ulti-energy-source.json',import.meta.url))).fixtures;
 assert.equal(f.length,48);for(const {input,expected} of f)assert.deepEqual(gainUltiEnergy(input),expected);
});
