import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {limitStateLayers} from '../engine/state-layer-limits.mjs';
test('state layer limits match original property/statistics and live-state branches',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-state-layer-limits.json',import.meta.url),'utf8'));
  assert.equal(evidence.fixtures.length,432);
  for(const {input:v,expected} of evidence.fixtures){
    const actual=limitStateLayers({stateId:2669,layer:v.layer,mode:v.mode,rules:[{stateIds:[v.matching?2669:7],limit:v.limit,used:v.used}],getCurrentLayer:()=>v.state==='live'?v.used:0});
    assert.deepEqual(actual,expected,JSON.stringify(v));
  }
});
test('first positive matching rule wins, nonpositive rules do not block later rules',()=>{
  const rules=[{stateIds:[1],limit:0,used:99},{stateIds:[1],limit:5,used:1},{stateIds:[1],limit:1,used:0}];
  const result=limitStateLayers({stateId:1,layer:9,mode:'statistics',rules,getCurrentLayer:()=>{throw Error('unexpected lookup');}});
  assert.equal(result.layer,4);assert.deepEqual(result.trace,['limit','used','limit','used']);
});
