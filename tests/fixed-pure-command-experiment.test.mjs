import test from 'node:test';
import assert from 'node:assert/strict';
import {runFixedPureCommandExperiment} from '../engine/fixed-pure-command-experiment.mjs';

const fixed=()=>({schemaVersion:1,kind:'morimens-fixed-pure-command-experiment',build:'pc-res144-build51',category:'FIXED',interveningEffects:'assumed-absent',
  rows:[{id:'fixed',Type:'BEFixedDamage',Target:'UpperTarget',Para:'Arg1,2,0,0'}],variables:{Arg1:100},
  effect:{dimensionFixPer:25,fixed1:50,fixed2:0,fixed3:0,fixed4:0,fixed5:0},targetState:{hp:1000,block:50},repeatModifiers:{plus:0,per:0},immune:false});
const pure=()=>({schemaVersion:1,kind:'morimens-fixed-pure-command-experiment',build:'pc-res144-build51',category:'PURE',interveningEffects:'assumed-absent',
  rows:[{id:'pure',Type:'BEPureDamage',Target:'UpperTarget',Para:'100.2,1,1'}],variables:{},effect:{},targetState:{hp:1000,block:50},repeatModifiers:{plus:0,per:0},immune:false});

test('Fixed repeats use the recovered formula and shared shield/HP path',()=>{
  const value=fixed(),before=JSON.stringify(value),result=runFixedPureCommandExperiment(value);
  assert.equal(result.completed,true);assert.equal(result.modeledHpLost,326);assert.deepEqual(result.hits.map(hit=>hit.modeledHpLost),[138,188]);assert.equal(result.targetAfter.block,0);
  assert.equal(result.hits[0].calculation.experimentalModels.find(model=>Object.hasOwn(model,'preHitDamage')).preHitDamage,188);
  assert.equal(result.rowMetadata[0].damageSubType,0);assert.equal(JSON.stringify(value),before);
});

test('Fixed subtype 1 takes the recovered Puncture hit path',()=>{
  const value=fixed();value.rows[0].Para='100,1,1,0';const result=runFixedPureCommandExperiment(value);
  assert.equal(result.modeledHpLost,188);assert.equal(result.targetAfter.block,0);assert.equal(result.hits[0].calculation.damageType,'FIXED');
});

test('Pure preserves includeStats metadata while modeling only its damage and HP path',()=>{
  const result=runFixedPureCommandExperiment(pure());
  assert.equal(result.modeledHpLost,51);assert.equal(result.targetAfter.block,0);assert.equal(result.rowMetadata[0].includeStats,true);
  assert.equal(result.hits[0].calculation.experimentalModels.find(model=>Object.hasOwn(model,'preHitDamage')).preHitDamage,101);
});

test('Fixed/Pure command rejects mismatched rows and unsupported parameter meanings',()=>{
  const mismatch=fixed();mismatch.rows[0].Type='BEPureDamage';assert.throws(()=>runFixedPureCommandExperiment(mismatch),/FIXED rows/);
  const para=fixed();para.rows[0].Para='100,1,0,2';assert.throws(()=>runFixedPureCommandExperiment(para),/ParaPlus/);
  const stats=pure();stats.rows[0].Para='100,1,0';assert.throws(()=>runFixedPureCommandExperiment(stats),/includeStats/);
});
