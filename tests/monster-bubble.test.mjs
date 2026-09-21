import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('original monster bubble only records eligible monster presentation',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-monster-bubble.json',import.meta.url),'utf8'));
  assert.equal(evidence.fixtures.length,6);
  for(const {input,expected} of evidence.fixtures){
    assert.equal(expected.superCalls,1,JSON.stringify(input));
    const eligible=input.tipsId!==null&&input.targetPresent&&input.isRoleTypeMonster&&input.roleTypeMonster;
    assert.equal(expected.returned,eligible,JSON.stringify(input));
    assert.equal(expected.records.length,eligible?1:0,JSON.stringify(input));
    if(eligible)assert.deepEqual(expected.records[0],{uid:input.uid,tipsId:input.tipsId,showTime:input.showTime??1000});
  }
});

test('installed resource 150 reproduces the monster-bubble fixture domain',()=>{
  const current=JSON.parse(readFileSync(new URL('../research/evidence/pc-res150-monster-bubble-runtime.json',import.meta.url),'utf8'));
  assert.equal(current.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');assert.equal(current.moduleStatus,'IDENTICAL');assert.equal(current.fixtures,6);assert.equal(current.exactMatches,6);assert.deepEqual(current.mismatches,[]);assert.equal(current.sourceHashes.baselineModule,current.sourceHashes.currentModule);
});
