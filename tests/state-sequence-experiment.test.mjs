import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runStateSequenceExperiment} from '../engine/state-sequence-experiment.mjs';
import {neutralShowInputs} from '../engine/show-damage.mjs';
import {targetKeys} from '../engine/active-target.mjs';
import {stateLayerFamilies} from '../engine/state-layer-pipeline.mjs';

const stateConfig=JSON.parse(readFileSync(new URL('../research/extracted/config/State.json',import.meta.url),'utf8'))['80331'];
const attack=()=>({type:'attack',rows:[{id:'hit',Type:'BEActiveDamage',Target:'UpperTarget',Para:'100'}]});
const add=resolvedLayers=>({type:'addState',definitionId:80331,resolvedLayers});
function sample(){
  const {value,basicDamagePer,...offense}=neutralShowInputs(0);
  const targetModifiers={...Object.fromEntries(targetKeys.map(k=>[k,0])),isCrit:false,enemyStateDmgMultiplier:1};
  for(const key of ['awakerCritDamage','beDamagePer','beDamagePer2','beDamagePer3','vulnerablePer'])delete targetModifiers[key];
  return {schemaVersion:1,kind:'morimens-state-sequence',build:'pc-res144-build51',otherEvents:'assumed-absent',crossesTurnBoundary:false,
    actorProperties:{basic_damage_per:0,crit_damage:0,i_crit_damage_per:0},targetProperties:{be_damage_per:0,be_damage_per2:0,be_damage_per3:0,vulnerable_per:0},
    stateQueries:{'CmdCaster.GetStateLayer':{'133235':0}},definitions:[{id:80331,owner:'target',maximum:stateConfig.MaxLayer,
      properties:Object.entries(stateConfig.ExistProperty).map(([property,expression])=>({property,expression})),skillLevel:6,caster:1,specialValue:0,banned:false}],
    steps:[attack(),add(10),attack(),add(10),attack(),add(10),attack()],attackBase:{variables:{},offense,targetModifiers,repeatModifiers:{plus:0,per:0},immune:false,targetState:{hp:10000,block:0}}};
}
test('exported Psychic Trauma expressions flow through creation, merge, cap and later attacks',()=>{
  const input=sample(),before=JSON.stringify(input),r=runStateSequenceExperiment(input);
  assert.equal(r.completed,true);assert.equal(r.finalDamage,null);
  assert.deepEqual(r.trace.filter(t=>t.type==='attack').map(t=>t.result.modeledHpLost),[100,130,145,145]);
  assert.equal(r.modeledHpLost,520);assert.equal(r.properties.target.be_damage_per2,45);
  assert.equal(r.states[0].layer,15);
  const additions=r.trace.filter(t=>t.type==='addState');
  assert.equal(additions[2].mutations.length,0);assert.equal(additions[2].events.length,1);
  assert.equal(JSON.stringify(input),before);
});
test('order changes damage; initial cap preserves original ChangedLayer contribution',()=>{
  const a=sample();a.steps=[attack(),add(10)];
  const b=sample();b.steps=[add(10),attack()];
  assert.equal(runStateSequenceExperiment(a).modeledHpLost,100);assert.equal(runStateSequenceExperiment(b).modeledHpLost,130);
  b.steps=[add(20),attack()];const capped=runStateSequenceExperiment(b);
  assert.equal(capped.states[0].layer,15);assert.equal(capped.states[0].changedLayer,20);assert.equal(capped.properties.target.be_damage_per2,60);assert.equal(capped.modeledHpLost,160);
});
test('unknown state query, duplicate live binding and unsupported turn/events fail',()=>{
  const v=sample();v.stateQueries['CmdCaster.GetStateLayer']={};assert.throws(()=>runStateSequenceExperiment(v));
  const b=sample();b.attackBase.targetModifiers.beDamagePer2=0;assert.throws(()=>runStateSequenceExperiment(b));
  const c=sample();c.crossesTurnBoundary=true;assert.throws(()=>runStateSequenceExperiment(c));
  const d=sample();d.steps.push({type:'endTurn'});assert.throws(()=>runStateSequenceExperiment(d));
});
test('death stops before subsequent additions, and bans suppress mutations without removing contributions',()=>{
  const v=sample();v.attackBase.targetState.hp=50;const r=runStateSequenceExperiment(v);
  assert.equal(r.completed,false);assert.equal(r.states.length,0);
  const b=sample();b.definitions[0].banned=true;b.steps=[add(10),attack()];const banned=runStateSequenceExperiment(b);
  assert.equal(banned.modeledHpLost,100);assert.equal(banned.states[0].properties.be_damage_per2.value,30);
});

export {sample};

test('requested layers flow through modifier multiplication, limits, state creation and damage',()=>{
  const v=sample();
  const context={trigger:false,skipCaster:false,noDirect:false,ulti:false,casterPresent:true,awaker:true,currentCardPresent:false,currentCardInstruction:false,currentCardSkill:false,modifierCardPresent:false,modifierCardInstruction:false};
  const modifiers=Object.fromEntries(stateLayerFamilies.map(key=>[key,[]]));
  modifiers.StateLayerPer=[{property:'explicit_test_bonus',stateIds:[80331],percent:50,commandPowerOnly:false}];
  const request={layer:2,immune:false,context,modifiers,dimensionStateIds:[],perLimit:null,totalLimit:null};
  v.steps=[{type:'applyState',definitionId:80331,request},attack()];
  const roundingProbe=JSON.parse(readFileSync(new URL('../research/evidence/state-sequence-rounding-probe.json',import.meta.url),'utf8'));
  let r=runStateSequenceExperiment(v);assert.equal(r.states[0].layer,3);assert.equal(r.modeledHpLost,roundingProbe.expected);assert.equal(r.trace[0].layerCalculation.layer,3);
  request.layer=2.2;r=runStateSequenceExperiment(v);assert.equal(r.states[0].layer,5);assert.equal(r.trace[0].request.events[1].input,3);
  request.perLimit=2;request.totalLimit=4;r=runStateSequenceExperiment(v);assert.equal(r.states[0].layer,4);
  assert.equal(r.trace[0].request.events.find(e=>e.stage==='CalcStateLayerLimitTotal').input,5);
  request.immune=true;r=runStateSequenceExperiment(v);assert.equal(r.states.length,0);assert.equal(r.trace[0].layerCalculation,null);assert.equal(r.modeledHpLost,100);
  request.immune=false;request.perLimit=0;r=runStateSequenceExperiment(v);assert.equal(r.states.length,0);assert.equal(r.modeledHpLost,100);
  request.perLimit=null;request.totalLimit=null;request.dimensionStateIds=[80331];assert.throws(()=>runStateSequenceExperiment(v),/Dimension/);
  request.dimensionContext={hasCasterUid:true,hasRole:true,friendly:true,hasPlayer:true,percent:50};
  r=runStateSequenceExperiment(v);assert.equal(r.states[0].layer,7);assert.equal(r.trace[0].dimensionTrace[0].before,4.5);
  assert.equal(r.trace[0].dimensionTrace[0].value,7);assert.equal(r.properties.target.be_damage_per2,21);
  request.dimensionContext.hasPlayer=false;assert.throws(()=>runStateSequenceExperiment(v),/player is missing/);
  request.dimensionStateIds=[];request.layer=10;request.perLimit=null;request.totalLimit={rules:[{stateIds:[80331],limit:5}]};
  v.steps=[add(2),{type:'applyState',definitionId:80331,request},attack()];
  r=runStateSequenceExperiment(v);assert.equal(r.states[0].layer,5);assert.equal(r.trace[1].limitCalculations[0].layer,3);
  v.steps.splice(2,0,{type:'applyState',definitionId:80331,request});r=runStateSequenceExperiment(v);assert.equal(r.trace[2].state,null);assert.equal(r.states[0].layer,5);
  request.perLimit={rules:[{stateIds:[80331],limit:1,used:0}]};v.steps=[{type:'applyState',definitionId:80331,request}];
  r=runStateSequenceExperiment(v);assert.equal(r.states[0].layer,5);assert.deepEqual(r.trace[0].limitCalculations.map(c=>c.layer),[1,5]);
  request.perLimit=null;request.totalLimit=null;request.layer=2;
  request.immune={buffType:'none',properties:{immue_buff:0,immue_debuff:0,immue_both_buff:1},specificRules:[]};
  r=runStateSequenceExperiment(v);assert.equal(r.states[0].layer,3);assert.equal(r.trace[0].immunityCalculation.immune,false);
  request.immune.specificRules=[{property:'explicit_immunity',stateIds:[80331],value:1}];
  r=runStateSequenceExperiment(v);assert.equal(r.states.length,0);assert.equal(r.trace[0].immunityCalculation.immune,true);assert.equal(r.trace[0].layerCalculation,null);
  request.layer=0;r=runStateSequenceExperiment(v);assert.equal(r.trace[0].immunityCalculation,null);assert.deepEqual(r.trace[0].request.events,[]);
});

test('explicit removal restores stored contributions once and reapplication creates a new live state',()=>{
  const v=sample(),remove=()=>({type:'removeState',definitionId:80331});
  v.steps=[add(10),attack(),remove(),attack(),remove(),attack(),add(10),attack()];
  const r=runStateSequenceExperiment(v);
  assert.deepEqual(r.trace.filter(t=>t.type==='attack').map(t=>t.result.modeledHpLost),[130,100,100,130]);
  assert.equal(r.states.length,2);assert.equal(r.states[0].isDeleted,true);assert.equal(r.states[1].isDeleted,false);assert.notEqual(r.states[0].uid,r.states[1].uid);
  assert.equal(r.trace[2].events[0].kind,'StateLifeEnd');assert.equal(r.trace[4].events.length,0);
  assert.equal(r.trace[2].state.properties.be_damage_per2.value,30);
});

test('removed states disappear from live attack conditions and initial over-cap contributions are fully reversed',()=>{
  const v=sample();v.stateQueries={'Target.GetStateLayer':{liveOwner:'target'},'CmdCaster.GetStateLayer':{'133235':0}};
  const conditioned=attack();conditioned.rows[0].Cond='Target.GetStateLayer(80331)>0';
  v.steps=[add(20),{type:'removeState',definitionId:80331},conditioned];
  const r=runStateSequenceExperiment(v);assert.equal(r.properties.target.be_damage_per2,0);assert.equal(r.modeledHpLost,0);
  assert.equal(r.trace[1].mutations[0].castValue,-60);assert.equal(r.trace[2].result.command.trace[0].condition.calls[0].value,0);
});

test('attack conditions and repeated parameters query states created earlier in the sequence',()=>{
  const v=sample();v.stateQueries={'CmdCaster.GetStateLayer':{liveOwner:'actor'}};
  v.definitions=[{id:90001,owner:'actor',maximum:'10',properties:[],skillLevel:1,caster:1,specialValue:0,banned:false}];
  const queryAttack=()=>({type:'attack',rows:[{id:'conditional',Type:'BEActiveDamage',Target:'UpperTarget',Cond:'CmdCaster.GetStateLayer(90001)>0',Para:'100*(1+CmdCaster.GetStateLayer(90001)/10),2'}]});
  v.steps=[queryAttack(),{type:'addState',definitionId:90001,resolvedLayers:2},queryAttack()];
  const r=runStateSequenceExperiment(v);
  assert.equal(r.trace[0].result.hits.length,0);assert.equal(r.trace[0].result.command.trace[0].condition.calls[0].value,0);
  assert.deepEqual(r.trace[2].result.hits.map(h=>h.modeledHpLost),[120,120]);
  const row=r.trace[2].result.command.trace[0];assert.equal(row.condition.calls[0].value,2);
  assert.equal(row.parameterEvaluations.length,3);assert.ok(row.parameterEvaluations.every(e=>e.calls[0].value===2));
});

test('live state binding changes a later state cap and hit; static and live inputs cannot mix',()=>{
  const v=sample();v.stateQueries={'CmdCaster.GetStateLayer':{liveOwner:'actor'}};
  v.definitions[0].maximum='5+CmdCaster.GetStateLayer(90001)*5';
  v.definitions.push({id:90001,owner:'actor',maximum:'10',properties:[],skillLevel:1,caster:1,specialValue:0,banned:false});
  v.steps=[add(1),{type:'addState',definitionId:90001,resolvedLayers:2},add(10),attack()];
  const result=runStateSequenceExperiment(v);
  assert.equal(result.states.find(s=>s.stateId===80331).layer,11);assert.equal(result.modeledHpLost,133);
  assert.deepEqual(result.trace[2].expressions[0].calls,[{name:'CmdCaster.GetStateLayer',args:[90001],value:2}]);
  v.steps.splice(1,1);const absent=runStateSequenceExperiment(v);
  assert.equal(absent.states[0].layer,5);assert.equal(absent.modeledHpLost,115);
  v.stateQueries['CmdCaster.GetStateLayer']['90001']=99;assert.throws(()=>runStateSequenceExperiment(v));
});

test('actual state 2669 changes live critical damage with explicit amplification',()=>{
  const input=sample(),state=JSON.parse(readFileSync(new URL('../research/extracted/config/State.json',import.meta.url),'utf8'))['2669'];
  input.actorProperties={basic_damage_per:0,crit_damage:0,i_crit_damage_per:50};
  input.attackBase.targetModifiers.isCrit=true;
  input.definitions=[{id:2669,owner:'actor',maximum:String(state.MaxLayer),properties:Object.entries(state.ExistProperty).map(([property,expression])=>({property,expression})),skillLevel:6,caster:1,specialValue:0,banned:false}];
  input.steps=[attack(),{type:'addState',definitionId:2669,resolvedLayers:10},attack(),{type:'removeState',definitionId:2669},attack()];
  const result=runStateSequenceExperiment(input);
  assert.deepEqual(result.trace.filter(t=>t.type==='attack').map(t=>t.result.modeledHpLost),[100,115,105]);
  assert.equal(result.properties.actor.crit_damage,5);
  assert.deepEqual(result.trace[1].mutations[0].callbacks,[
    {kind:'owner',property:'crit_damage',old:0,new:15},
    {kind:'send',property:'crit_damage',delta:15,new:15}
  ]);
  assert.deepEqual(result.trace[3].mutations[0].callbacks,[
    {kind:'owner',property:'crit_damage',old:15,new:5},
    {kind:'send',property:'crit_damage',delta:-10,new:5}
  ]);
});
