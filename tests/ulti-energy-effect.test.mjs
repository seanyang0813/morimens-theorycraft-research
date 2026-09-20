import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runUltiEnergyEffect} from '../engine/ulti-energy-effect.mjs';
test('energy effect matches 120 original repetitions, source payloads and call order',()=>{
 const fixtures=JSON.parse(readFileSync(new URL('./synthetic/original-ulti-energy-effect.json',import.meta.url))).fixtures;
 assert.equal(fixtures.length,120);
 for(const {input,expected} of fixtures){
  const events=[];let count=0;
  const r=runUltiEnergyEffect({...input,source:{castRoleUid:1,cmdServerUid:2,skillConfigId:3},calculate:(base,target)=>{events.push({stage:'calculate',target,base});return base+(++count);},gain:(target,value,source)=>events.push({stage:'gain',target,value,source})});
  assert.deepEqual({returned:r.returned,events},expected);
 }
});
test('numeric zero showText is false and zero repetitions do not calculate',()=>{
 let calls=0;
 const r=runUltiEnergyEffect({parameters:[10,0,0],targets:[1],source:{castRoleUid:1,cmdServerUid:2,skillConfigId:3},calculate:()=>++calls,gain:()=>{}});
 assert.equal(r.initialization.showText,false);assert.equal(calls,0);
});
