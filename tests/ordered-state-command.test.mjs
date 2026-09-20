import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runOrderedStateCommand} from '../engine/ordered-state-command.mjs';

const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
function input(){
  const base=read('../research/examples/damage-energy-command.json'),commands=read('../research/extracted/config/Cmd.json'),states=read('../research/extracted/config/State.json'),state=states['19534'];
  return {schemaVersion:1,kind:'morimens-ordered-state-command',build:base.build,otherEvents:'assumed-absent',command:commands['45948'],variables:{Arg1:100},
    targetBinding:{expression:'UpperTarget',resolution:'supplied-single-UpperTarget'},attackBase:base.attackBase,
    state:{definitions:[{id:19534,owner:'target',maximum:String(state.MaxLayer),properties:Object.entries(state.ExistProperty).map(([property,expression])=>({property,expression:String(expression)})),skillLevel:1,caster:7,specialValue:0,banned:false}],
      requests:[{layer:null,immune:false,context:{trigger:false,skipCaster:false,noDirect:false,ulti:false,casterPresent:true,awaker:true,currentCardPresent:true,currentCardInstruction:true,currentCardSkill:false,modifierCardPresent:true,modifierCardInstruction:true},modifiers:Object.fromEntries(['StateLayerPer','UltiStateLayerPer','CmdCardStateLayerPer','StateLayerPerByCard','BeStateLayerPer','BeDirectCmdStateLayerPer','UltiFixedStateLayerPer','CmdCardFixedStateLayerPer','CardFixedStateLayerPer','DirectCmdStateLayerPer'].map(k=>[k,[]])),dimensionStateIds:[],perLimit:null,totalLimit:null}],
      actorProperties:{basic_damage_per:base.attackBase.offense.basicDamagePer,crit_damage:base.attackBase.targetModifiers.awakerCritDamage,i_crit_damage_per:0},
      targetProperties:{be_damage_per:base.attackBase.targetModifiers.beDamagePer,be_damage_per2:base.attackBase.targetModifiers.beDamagePer2,be_damage_per3:base.attackBase.targetModifiers.beDamagePer3,vulnerable_per:base.attackBase.targetModifiers.vulnerablePer},stateQueries:{}}};
}

test('actual exported state-before-damage command applies Vulnerable before its hit',()=>{
  const v=input(),before=JSON.stringify(v),r=runOrderedStateCommand(v);
  assert.equal(r.completed,true);assert.equal(r.modeledHpLost,125);assert.equal(r.targetAfter.hp,875);assert.equal(r.properties.target.vulnerable_per,25);
  assert.deepEqual(r.calculation.trace.map(step=>step.type),['applyState','attack']);
  assert.equal(r.rowPlan[1].delay,350);assert.match(r.delayPolicy,/other events/);assert.equal(JSON.stringify(v),before);
});

test('later damage parameters and conditions read a state created by an earlier row',()=>{
  const v=input(),request=v.state.requests[0];
  v.command={data_list:{1:{Type:'BEAddState',Target:'CmdCaster',Para:'90001,2'},2:{Type:'BEActiveDamage',Target:'UpperTarget',Cond:'CmdCaster.GetStateLayer(90001)>0',Para:'100*(1+CmdCaster.GetStateLayer(90001)/10),2'}}};
  v.state.definitions=[{id:90001,owner:'actor',maximum:'10',properties:[],skillLevel:1,caster:7,specialValue:0,banned:false}];request.layer=2;
  v.state.stateQueries={'CmdCaster.GetStateLayer':{liveOwner:'actor'}};
  const r=runOrderedStateCommand(v);
  assert.equal(r.modeledHpLost,240);assert.equal(r.states[0].layer,2);
  const attack=r.calculation.trace[1].result;
  assert.deepEqual(attack.hits.map(hit=>hit.modeledHpLost),[120,120]);
  assert.equal(attack.command.trace[0].condition.calls[0].value,2);
  assert.ok(attack.command.trace[0].parameterEvaluations.every(item=>item.calls[0].value===2));
});

test('row order remains observable and unsupported effects or fields fail closed',()=>{
  const v=input(),first=v.command.data_list['1'];v.command.data_list['1']=v.command.data_list['2'];v.command.data_list['2']=first;
  assert.equal(runOrderedStateCommand(v).modeledHpLost,100);
  for(const mutate of [x=>{x.command.data_list['1'].Type='BERemoveState';},x=>{x.command.data_list['1'].VFX={1:1};},x=>{x.command.data_list['1'].Target='AllEnemy';},x=>{x.state.requests[0].layer=1;}]){
    const bad=input();mutate(bad);assert.throws(()=>runOrderedStateCommand(bad));
  }
});

test('ordered subtraction and removal update later damage and live state queries',()=>{
  const v=input(),states=read('../research/extracted/config/State.json'),state=states['80331'];
  v.command={data_list:{1:{Type:'BEAddState',Target:'UpperTarget',Para:'80331,10'},2:{Type:'BEActiveDamage',Target:'UpperTarget',Para:'100'},3:{Type:'BESubStateLayer',Target:'UpperTarget',Para:'80331,5'},4:{Type:'BEActiveDamage',Target:'UpperTarget',Para:'100'},5:{Type:'BERemoveState',Target:'UpperTarget',Para:'80331'},6:{Type:'BEActiveDamage',Target:'UpperTarget',Para:'100'}}};
  v.state.definitions=[{id:80331,owner:'target',maximum:String(state.MaxLayer),properties:Object.entries(state.ExistProperty).map(([property,expression])=>({property,expression:String(expression)})),skillLevel:6,caster:7,specialValue:0,banned:false}];
  v.state.requests[0].layer=10;v.state.stateQueries={'CmdCaster.GetStateLayer':{'133235':0}};
  const r=runOrderedStateCommand(v);
  assert.equal(r.modeledHpLost,345);assert.equal(r.properties.target.be_damage_per2,0);assert.equal(r.states[0].isDeleted,true);
  assert.deepEqual(r.calculation.trace.map(step=>step.type),['applyState','attack','subtractState','attack','removeState','attack']);
  assert.deepEqual(r.calculation.trace.filter(step=>step.type==='attack').map(step=>step.result.modeledHpLost),[130,115,100]);
});

test('actual exported damage-energy-state command executes all three rows in order',()=>{
  const base=read('../research/examples/damage-energy-command.json'),commands=read('../research/extracted/config/Cmd.json'),states=read('../research/extracted/config/State.json'),definition=states['2669'];
  const v=input();
  v.command=commands['57564'];v.variables={Arg1:120,Arg2:10};v.targetBinding={expression:'FrontEnemy',resolution:'supplied-single-UpperTarget'};
  v.energy=base.energy;v.state.actorProperties.crit_damage=5;v.attackBase.targetModifiers.awakerCritDamage=5;
  v.state.definitions=[{id:2669,owner:'actor',maximum:String(definition.MaxLayer),properties:Object.entries(definition.ExistProperty).map(([property,expression])=>({property,expression:String(expression)})),skillLevel:1,caster:7,specialValue:0,banned:false}];
  v.state.requests=[{...v.state.requests[0],layer:10}];
  const r=runOrderedStateCommand(v);
  assert.equal(r.completed,true);assert.equal(r.modeledHpLost,120);assert.equal(r.targetAfter.hp,880);assert.equal(r.casterEnergyAfter,100);assert.equal(r.properties.actor.crit_damage,15);
  assert.deepEqual(r.calculation.trace.map(step=>step.type),['attack','gainUltiEnergy','applyState']);
  assert.deepEqual(r.rowPlan.map(row=>row.type),['attack','gainUltiEnergy','applyState']);
});

test('ordered energy fails closed without caster context or with an unsupported condition',()=>{
  const base=read('../research/examples/damage-energy-command.json'),commands=read('../research/extracted/config/Cmd.json'),v=input();
  v.command=commands['57564'];v.variables={Arg1:120,Arg2:10};v.targetBinding.expression='FrontEnemy';
  assert.throws(()=>runOrderedStateCommand(v),/energy requires/i);
  v.energy=base.energy;v.command.data_list['2'].Cond='true';
  assert.throws(()=>runOrderedStateCommand(v),/conditional state and energy/i);
});
