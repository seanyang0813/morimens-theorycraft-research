import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runTerminalStateCommand} from '../engine/terminal-state-command.mjs';
const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url)));
function input(){
  const mixed=read('../research/examples/damage-energy-command.json'),commands=read('../research/extracted/config/Cmd.json'),state=read('../research/extracted/config/State.json')['2669'];
  mixed.kind='morimens-terminal-state-command';mixed.command=commands['57564'];mixed.variables={Arg1:120,Arg2:10};mixed.targetBinding={expression:'FrontEnemy',resolution:'supplied-single-UpperTarget'};
  mixed.state={definition:{id:2669,owner:'actor',maximum:String(state.MaxLayer),properties:Object.entries(state.ExistProperty).map(([property,expression])=>({property,expression})),skillLevel:6,caster:7,specialValue:0,banned:false},
    request:{layer:10,immune:false,context:{trigger:false,skipCaster:false,noDirect:false,ulti:false,casterPresent:true,awaker:true,currentCardPresent:true,currentCardInstruction:true,currentCardSkill:false,modifierCardPresent:true,modifierCardInstruction:true},modifiers:Object.fromEntries(['StateLayerPer','UltiStateLayerPer','CmdCardStateLayerPer','StateLayerPerByCard','BeStateLayerPer','BeDirectCmdStateLayerPer','UltiFixedStateLayerPer','CmdCardFixedStateLayerPer','CardFixedStateLayerPer','DirectCmdStateLayerPer'].map(k=>[k,[]])),dimensionStateIds:[],perLimit:null,totalLimit:null},
    actorProperties:{basic_damage_per:mixed.attackBase.offense.basicDamagePer,crit_damage:mixed.attackBase.targetModifiers.awakerCritDamage,i_crit_damage_per:50},
    targetProperties:{be_damage_per:mixed.attackBase.targetModifiers.beDamagePer,be_damage_per2:mixed.attackBase.targetModifiers.beDamagePer2,be_damage_per3:mixed.attackBase.targetModifiers.beDamagePer3,vulnerable_per:mixed.attackBase.targetModifiers.vulnerablePer},stateQueries:{}};
  return mixed;
}
test('actual three-effect command executes complete prefix then applies real terminal state 2669',()=>{
  const v=input(),before=JSON.stringify(v),r=runTerminalStateCommand(v);
  assert.equal(r.completed,true);assert.equal(r.targetAfter.hp,880);assert.equal(r.casterEnergyAfter,100);
  assert.equal(r.stateApplication.properties.actor.crit_damage,15);assert.equal(r.stateApplication.states[0].stateId,2669);assert.equal(r.stateApplication.states[0].layer,10);
  assert.deepEqual(r.prefix.actions.map(a=>a.type),['damage','energy']);assert.equal(JSON.stringify(v),before);
});
test('state mismatch or incomplete prefix prevents terminal application',()=>{
  const v=input();v.state.definition.id=1;assert.throws(()=>runTerminalStateCommand(v),/agree/);
  const lethal=input();lethal.variables.Arg1=2000;const stopped=runTerminalStateCommand(lethal);assert.equal(stopped.completed,false);assert.equal(stopped.stateApplication,null);assert.equal(stopped.casterEnergyAfter,undefined);
});
test('nonterminal, conditional or wrong-target state rows remain unsupported',()=>{
  for(const mutate of [
    v=>{const a=v.command.data_list['2'];v.command.data_list['2']=v.command.data_list['3'];v.command.data_list['3']=a;},
    v=>{v.command.data_list['3'].Cond='true';},
    v=>{v.command.data_list['3'].Target='UpperTarget';}
  ]){const v=input();mutate(v);assert.throws(()=>runTerminalStateCommand(v),/[Tt]erminal/);}
});
test('actual damage then Vulnerable command applies its terminal state to the supplied target',()=>{
 const v=input(),commands=read('../research/extracted/config/Cmd.json'),state=read('../research/extracted/config/State.json')['2934'];
 v.command=commands['23548'];v.variables={Arg1:120,Arg2:2};v.targetBinding.expression='UpperTarget';
 v.state.definition={id:2934,owner:'target',maximum:String(state.MaxLayer),properties:Object.entries(state.ExistProperty).map(([property,expression])=>({property,expression:String(expression)})),skillLevel:1,caster:7,specialValue:0,banned:false};
 v.state.request.layer=2;
 const r=runTerminalStateCommand(v);
 assert.equal(r.completed,true);assert.equal(r.targetAfter.hp,760);assert.equal(r.casterEnergyAfter,95);
 assert.equal(r.stateApplication.properties.target.vulnerable_per,50);assert.equal(r.stateApplication.states[0].stateId,2934);
});
test('actual damage and two-state suffix applies both requests in exported row order',()=>{
 const v=input(),commands=read('../research/extracted/config/Cmd.json'),state=read('../research/extracted/config/State.json')['3023'];
 v.command=commands['117897'];v.variables={Arg1:120,Arg2:1,Arg3:2,Arg4:3,Arg5:4};v.targetBinding.expression='UpperTarget';
 const definition={id:3023,owner:'actor',maximum:String(state.MaxLayer),properties:[],skillLevel:1,caster:7,specialValue:0,banned:false};
 const first=JSON.parse(JSON.stringify(v.state.request)),second=JSON.parse(JSON.stringify(v.state.request));first.layer=2;second.layer=12;
 v.state={definitions:[definition],requests:[first,second],actorProperties:v.state.actorProperties,targetProperties:v.state.targetProperties,stateQueries:{}};
 const r=runTerminalStateCommand(v);
 assert.equal(r.completed,true);assert.equal(r.targetAfter.hp,880);assert.equal(r.casterEnergyAfter,95);assert.equal(r.terminalRow,null);
 assert.deepEqual(r.terminalRows.map(row=>row.evaluation.values),[[3023,2],[3023,12]]);
 assert.equal(r.stateApplication.states.length,1);assert.equal(r.stateApplication.states[0].layer,14);
 assert.deepEqual(r.stateApplication.trace.map(step=>step.type),['applyState','applyState']);
});
