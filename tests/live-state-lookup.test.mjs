import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getLiveStateLayer} from '../engine/live-state-lookup.mjs';
test('live lookup matches 24 connected original expression/manager cases',()=>{
  const data=JSON.parse(readFileSync(new URL('./synthetic/original-live-state-lookup.json',import.meta.url),'utf8'));
  assert.equal(data.fixtures.length,24);
  for(const {input:v,expected} of data.fixtures){
    const registry=new Map([[7,v.states.map(s=>({stateId:s.stateId,layer:s.layer,isDeleted:s.deleted}))]]);
    assert.equal(getLiveStateLayer({registry,ownerUid:v.hasTarget?7:null,stateId:v.query}),expected);
  }
});
