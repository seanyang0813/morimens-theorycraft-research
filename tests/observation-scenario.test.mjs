import test from 'node:test';
import assert from 'node:assert/strict';
import {runObservationScenario} from '../engine/observation-scenario.mjs';

const build='pc-res144-build51';
const fixed=amount=>({build,mode:'experimental',damageType:'FIXED',effect:{build,category:'FIXED',targetDead:false,baseDamage:amount,dimensionFixPer:0,fixed1:0,fixed2:0,fixed3:0,fixed4:0,fixed5:0}});
const step=(id,amount)=>({id,immune:false,puncture:false,scenario:fixed(amount)});
test('observation dispatcher preserves single-hit metric scope',()=>{
  const result=runObservationScenario(fixed(123),'preHitDamage');
  assert.equal(result.value,123);assert.equal(result.scenarioKind,'single-hit');assert.equal(result.metric,'preHitDamage');
});
test('observation dispatcher exposes schema 2 snapshot modeled HP loss',()=>{
  const scenario={schemaVersion:2,kind:'morimens-battle-property-snapshot-damage',build:'pc-res150-build51',snapshotStage:'battle-property-server-live',snapshotCompleteness:'complete-map',baseValue:100,skillArgsPlus:0,tags:['Card_Strike'],casterProperties:{crit:100,crit_damage:50,crit_damage_from_strikecard:10,crit_damage_per:0,damage_per2monster_boss:20},playerProperties:{dimension_fix_per:0},targetProperties:{hp:1000,max_hp:1000,block:50,be_damage_per:10,vulnerable_per:50},cardProperties:{},cardContext:{present:false,instructionCard:false,stateTriggerAdd:false},targetContext:{critRoll:null,targetBattleTag:'Boss',targetStateIds:[]},hitContext:{damageSubtype:'Ordinary'}};
  assert.equal(runObservationScenario(scenario,'preHitDamage').value,317);
  const hp=runObservationScenario(scenario,'modeledHpLost');assert.equal(hp.value,267);assert.equal(hp.scenarioKind,scenario.kind);
  delete scenario.hitContext;scenario.schemaVersion=1;assert.throws(()=>runObservationScenario(scenario,'modeledHpLost'),/unavailable/);
});
test('observation dispatcher exposes completed snapshot sequence modeled HP loss',()=>{
  const hit=id=>({id,baseValue:100,skillArgsPlus:0,tags:['Card_Strike'],cardProperties:{},cardContext:{present:false,instructionCard:false,stateTriggerAdd:false},targetContext:{critRoll:null,targetBattleTag:'Boss',targetStateIds:[]},hitContext:{damageSubtype:'Ordinary'}});
  const scenario={schemaVersion:1,kind:'morimens-snapshot-active-sequence',build:'pc-res150-build51',snapshotStage:'battle-property-server-live',snapshotCompleteness:'complete-map',interveningEffects:'assumed-absent',casterProperties:{crit:0,crit_damage:0,crit_damage_from_strikecard:0,crit_damage_per:0},playerProperties:{dimension_fix_per:0},initialTargetProperties:{hp:250,max_hp:250,block:50,be_damage_per:0,vulnerable_per:0},hits:[hit('one'),hit('two')]};
  const result=runObservationScenario(scenario,'modeledHpLost');assert.equal(result.value,150);assert.equal(result.scenarioKind,scenario.kind);
  assert.throws(()=>runObservationScenario(scenario,'preHitDamage'),/unavailable/);
});
test('observation dispatcher supports completed high-difficulty Old Embers timelines',()=>{
  const scenario={schemaVersion:1,build,interveningEffects:'old-embers-only-assumed',target:{hp:1000,block:0},oldEmbersLayers:100,steps:[step('hit',20)]};
  const result=runObservationScenario(scenario,'modeledHpLost');
  assert.equal(result.value,50);assert.equal(result.scenarioKind,'old-embers-hit-timeline');
  assert.throws(()=>runObservationScenario(scenario,'preHitDamage'),/unavailable/);
});
test('observation dispatcher refuses partial timelines and unknown shapes',()=>{
  const lethal={schemaVersion:1,build,interveningEffects:'assumed-absent',target:{hp:10,block:0},steps:[step('lethal',20),step('unresolved',1)]};
  assert.throws(()=>runObservationScenario(lethal,'modeledHpLost'),/did not complete/);
  assert.throws(()=>runObservationScenario({build},'modeledHpLost'),/Unsupported/);
});
