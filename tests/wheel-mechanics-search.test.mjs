import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {searchWheelMechanics} from '../engine/wheel-mechanics-search.mjs';

const catalog=JSON.parse(readFileSync(new URL('../research/evidence/wheel-mechanics-capability-catalog.json',import.meta.url)));
const request=patch=>({schemaVersion:1,kind:'morimens-wheel-mechanics-search',requestId:'test',query:'',mechanicCategories:[],effectTypes:[],crosswalkStatuses:[],hasStaticCycle:null,limit:146,...patch});

test('Wheel mechanics search stays in mechanics track and supports exact categories',()=>{
  const result=searchWheelMechanics(request({mechanicCategories:['damage'],crosswalkStatuses:['UNIQUE']}),catalog);
  assert.equal(result.analysisTrack,'mechanics');
  assert.ok(result.results.length>0);
  assert.ok(result.results.every(row=>row.crosswalkStatus==='UNIQUE'&&row.mechanicCategories.includes('damage')));
  assert.ok(result.limitations.some(value=>value.includes('does not rank')));
});

test('Wheel mechanics search exposes bounded Mouchette and Arachne fingerprints',()=>{
  const result=searchWheelMechanics(request({query:'Eternal Weave'}),catalog);
  assert.deepEqual(result.results.map(row=>row.name),['Eternal Weave']);
  assert.ok(result.results[0].mechanicCategories.includes('ultimate-energy'));
  assert.equal(result.results[0].potentiallyLinkedStates,3);
});

test('Wheel mechanics search rejects cross-track and loose-schema requests',()=>{
  assert.throws(()=>searchWheelMechanics({...request({}),analysisTrack:'theorycrafting'},catalog));
  assert.throws(()=>searchWheelMechanics(request({mechanicCategories:['damage','damage']}),catalog));
  assert.throws(()=>searchWheelMechanics(request({hasStaticCycle:'no'}),catalog));
  assert.throws(()=>searchWheelMechanics(request({limit:0}),catalog));
});
