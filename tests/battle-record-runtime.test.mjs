import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const suite=JSON.parse(readFileSync(new URL('./synthetic/original-battle-record.json',import.meta.url)));

test('selected original BattleRecord constructors retain event and payload boundaries',()=>{
  assert.equal(suite.fixtures.length,10);
  const methods=new Set(suite.fixtures.map(row=>row.input.method));
  assert.deepEqual(methods,new Set(['OnUseCard','OnBeHit','OnPropertyChanged','OnSelectTargets','OnAddState','OnChangeStateLayer']));
  for(const row of suite.fixtures){
    assert.equal(row.expected.time,row.input.time);
    assert.equal(Number.isFinite(row.expected.eventId),true);
    if(row.input.method==='OnBeHit')assert.equal(row.expected.data.sameBeHitConfig,true);
    if(row.input.method==='OnPropertyChanged')assert.equal(row.expected.data.sameExtraData,true);
    if(['OnSelectTargets','OnAddState','OnChangeStateLayer'].includes(row.input.method))assert.equal(row.expected.samePayload,true);
  }
});
