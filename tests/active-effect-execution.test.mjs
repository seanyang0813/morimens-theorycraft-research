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
  assert.deepEqual(one.hitEvents,[{castDamage:100,changeVal:100,realDamage:100,curHp:900,isCrit:false}]);
  assert.equal(one.hpAfter,900);
  assert.deepEqual(one.propertyEvents,[{kind:'send',property:'hp',delta:-100,new:900}]);
  assert.deepEqual(one.eventEffects,[
    {event:'RoleHpChanged',oldValue:1000,newValue:900},
    {event:'RoleHpperChanged',oldValue:1000,newValue:900},
    {event:'DoDamage',changeVal:100,castDamage:100,curHp:900},
    {event:'BeDamage',changeVal:100,castDamage:100,curHp:900},
  ]);
  assert.deepEqual(one.delays,[.1,0,0]);
  const percent=report.fixtures.find(row=>row.input.name==='percent-repeat').expected;
  assert.equal(percent.effect.totalEffectTimes,3);
  assert.equal(percent.effect.leftEffectTimes,1);
  assert.deepEqual(percent.formulaOutputs,[100,100,100,100]);
  assert.deepEqual(percent.hitEvents,[{castDamage:100,changeVal:100,realDamage:100,curHp:900,isCrit:false},{castDamage:100,changeVal:100,realDamage:100,curHp:800,isCrit:false}]);
  assert.equal(percent.hpAfter,800);
  assert.deepEqual(percent.eventEffects.map(row=>row.event),['RoleHpChanged','RoleHpperChanged','DoDamage','BeDamage','RoleHpChanged','RoleHpperChanged','DoDamage','BeDamage']);
  assert.deepEqual(percent.delays,[.5,0,.25,0,0]);
  const skipped=report.fixtures.find(row=>row.input.name==='skip-phase').expected;
  assert.deepEqual(skipped.formulaOutputs,[100,150,100,150]);
  assert.deepEqual(skipped.hitEvents,[{castDamage:150,changeVal:150,realDamage:150,curHp:850,isCrit:true},{castDamage:150,changeVal:150,realDamage:150,curHp:700,isCrit:true}]);
  assert.equal(skipped.hpAfter,700);
  assert.deepEqual(skipped.delays,[.5,0,0,0,0]);
});
