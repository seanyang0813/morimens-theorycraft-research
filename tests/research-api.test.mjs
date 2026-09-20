import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateDamage,build} from '../engine/calculate-damage.mjs';
import {neutralShowInputs} from '../engine/show-damage.mjs';
import {activeTargetDamage,targetKeys} from '../engine/active-target.mjs';
const target=()=>({...Object.fromEntries(targetKeys.map(k=>[k,0])),isCrit:false,enemyStateDmgMultiplier:1});
const scenario=()=>({build,damageType:'ACTIVE',offense:neutralShowInputs(100),target:target()});

test('strict mode cannot promote a synthetic input into a verified result',()=>{
  const r=calculateDamage(scenario());
  assert.equal(r.finalDamage,null);assert.equal(r.status,'UNVERIFIED');assert.equal(r.experimentalModels.length,0);
  assert.ok(r.unresolvedDependencies.some(x=>x.includes('holdouts')));
});
test('experimental output is bounded to pre-hit formula and keeps unresolved state',()=>{
  const r=calculateDamage({...scenario(),mode:'experimental',unresolvedDependencies:['equipment unknown']});
  assert.equal(r.finalDamage,null);assert.equal(r.experimentalModels[0].preHitDamage,100);
  assert.ok(r.unresolvedDependencies.includes('equipment unknown'));
});
test('unsupported builds and categories do not reuse current Active results',()=>{
  for(const input of [{...scenario(),build:'android'},{...scenario(),damageType:'TENTACLE'}]){
    const r=calculateDamage(input);assert.equal(r.finalDamage,null);assert.equal(r.offensiveUtility,undefined);
  }
  for(const damageType of ['PURE','FIXED'])assert.throws(()=>calculateDamage({...scenario(),damageType}),/category-specific/);
});
test('distinct target slots multiply; synthetic diagnostic, not gameplay evidence',()=>{
  assert.equal(activeTargetDamage(100,{...target(),beDamagePer:25,beDamagePer2:20}).preHitDamage,150);
  assert.equal(activeTargetDamage(100,{...target(),beDamagePer:45}).preHitDamage,145);
  assert.equal(activeTargetDamage(100,{...target(),vulnerablePer:50,beDamagePer2:30}).preHitDamage,195);
});
test('noncrit ignores crit bonuses, and missing or unknown target fields fail',()=>{
  assert.equal(activeTargetDamage(100,{...target(),awakerCritDamage:50}).preHitDamage,100);
  assert.throws(()=>activeTargetDamage(100,{}),/Missing/);
  assert.throws(()=>activeTargetDamage(100,{...target(),unmappedDebuff:10}),/unrecognized/);
});
