import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stateOwnerTargets} from '../engine/state-owner-target.mjs';
const data=JSON.parse(readFileSync(new URL('./synthetic/original-state-owner-target.json',import.meta.url)));
test('StateOwner raw lookup matches five original parser executions',()=>{
  for(const {input:v,expected} of data.fixtures){
    const lookups=[];let errorCount=0;
    const owner={uid:7};
    const targets=stateOwnerTargets({stateUid:v.stateUid,getState:uid=>{lookups.push(uid);return v.stateExists?{owner:v.ownerExists?owner:null}:null;},onMissingState:()=>errorCount++});
    if(targets.length)assert.equal(targets[0],owner);
    assert.deepEqual({targets:targets.map(t=>t.uid),lookups,errorCount},expected);
  }
});
