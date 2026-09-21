import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync(new URL('./synthetic/original-active-effect-execution.json',import.meta.url)));

test('original Active effect dispatches through the real child into Damage2SingleTarget',()=>{
  assert.equal(report.fixtures.length,4);
  const one=report.fixtures.find(row=>row.input.name==='one-hit').expected;
  assert.equal(one.eligible,true);
  assert.equal(one.executed,true);
  assert.deepEqual(one.effect,{uid:101,parentEffectUid:0,preTriggerTime:12.5,totalEffectTimes:1,leftEffectTimes:0});
  assert.deepEqual(one.childConfigs,[{targetUid:20}]);
  assert.deepEqual(one.childPreTriggers,[null]);
  assert.deepEqual(one.formulaOutputs,[100,100]);
  assert.deepEqual(one.hitEvents,[{damageVal:100,isCrit:false}]);
  assert.deepEqual(one.delays,[.1,0,0]);
  const percent=report.fixtures.find(row=>row.input.name==='percent-repeat').expected;
  assert.equal(percent.effect.totalEffectTimes,3);
  assert.equal(percent.effect.leftEffectTimes,1);
  assert.deepEqual(percent.formulaOutputs,[100,100,100,100]);
  assert.deepEqual(percent.hitEvents,[{damageVal:100,isCrit:false},{damageVal:100,isCrit:false}]);
  assert.deepEqual(percent.delays,[.5,0,.25,0,0]);
  const skipped=report.fixtures.find(row=>row.input.name==='skip-phase').expected;
  assert.deepEqual(skipped.formulaOutputs,[100,150,100,150]);
  assert.deepEqual(skipped.hitEvents,[{damageVal:150,isCrit:true},{damageVal:150,isCrit:true}]);
  assert.deepEqual(skipped.delays,[.5,0,0,0,0]);
});
