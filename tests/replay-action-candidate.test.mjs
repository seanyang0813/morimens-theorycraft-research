import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReplayActionCandidate} from '../engine/replay-action-candidate.mjs';

const properties={hp:1000,max_hp:1000,block:0,crit:0,crit_damage:150};
const fixture=()=>({
  index:{kind:'MORIMENS_REPLAY_EVENT_INDEX',build:'pc-res144-build51',actionSnapshots:[{actionIndex:0,boundaryStatus:'COMPLETE',cardUid:30,camp:1,
    roles:{'1':{uid:1,tid:101,camp:1,roleType:1,breakSkillLevel:0,potencyLevel:0,properties:{...properties,crit:100}},'2':{uid:2,tid:201,camp:2,roleType:2,properties:{...properties}},'3':{uid:3,tid:0,camp:1,roleType:3,properties:{...properties}}},
    cards:{'30':{uid:30,tid:10,ownerUid:1,camp:1,cardArgs:{1:100},properties:{crit:0}}},activeStates:[],window:{selectedTargetCommands:[{data:{uids:[2]}}],events:[{recordIndex:4,frameIndex:2,eventName:'BeHit',data:{roleUid:2,beHitConfig:{castRoleUid:1,skillConfigId:10,castDamage:250,isCrit:true}}}],hits:[{recordIndex:4,frameIndex:2,eventName:'BeHit',data:{roleUid:2,beHitConfig:{castRoleUid:1,skillConfigId:10,castDamage:250,isCrit:true}}}],
      hitSnapshots:[{hitIndex:0,recordIndex:4,frameIndex:2,boundaryStatus:'COMPLETE',roles:{'1':{uid:1,tid:101,camp:1,roleType:1,breakSkillLevel:0,potencyLevel:0,properties:{...properties,crit:100}},'2':{uid:2,tid:201,camp:2,roleType:2,properties:{...properties}},'3':{uid:3,tid:0,camp:1,roleType:3,properties:{...properties}}},cards:{'30':{uid:30,tid:10,ownerUid:1,camp:1,cardArgs:{1:100},properties:{crit:0}}},activeStates:[],hitData:{roleUid:2,beHitConfig:{castRoleUid:1,skillConfigId:10,castDamage:250,isCrit:true}},reconstruction:{targetHp:'beHitConfig.oldHp',targetBlock:'post-event target block + beHitConfig.blockLose'}}]}}]},
  skills:{'10':{ID:10,CmdList:20,Type:{1:'Card_Strike'}}},commands:{'20':{data_list:{1:{Type:'BEActiveDamage',Target:'UpperTarget',Para:'Arg1'},2:{Type:'BEGainUltiEnergy',Target:'CmdCaster',Para:5}}}},monsters:{'201':{ID:201,BattleTag:'Boss'}}});

test('replay card boundary becomes a calculated regression candidate without reading observed damage',()=>{
  const input=fixture(),result=buildReplayActionCandidate({...input,actionIndex:0});
  assert.equal(result.status,'CALCULATED_REGRESSION_CANDIDATE');assert.equal(result.identities.targetUid,2);assert.equal(result.scenario.baseValue,100);assert.deepEqual(result.scenario.tags,['Card_Strike']);assert.equal(result.calculation.preHitDamage,250);assert.equal(result.observedHit.data.beHitConfig.castDamage,250);assert.equal(result.comparison.difference,0);
  input.index.actionSnapshots[0].window.hits[0].data.beHitConfig.castDamage=999;input.index.actionSnapshots[0].window.events[0].data.beHitConfig.castDamage=999;
  assert.equal(buildReplayActionCandidate({...input,actionIndex:0}).calculation.preHitDamage,250);
});

test('replay adapter refuses ambiguity and uses reconstructed damage-input maps after mutations',()=>{
  const target=fixture();target.index.actionSnapshots[0].window.selectedTargetCommands[0].data.uids.push(3);assert.throws(()=>buildReplayActionCandidate({...target,actionIndex:0}),/selected target/);
  const mutation=fixture();mutation.index.actionSnapshots[0].window.events.unshift({recordIndex:4,frameIndex:1,eventName:'PropertyChanged',data:{uid:1,propertyType:'crit_damage',value:200}});mutation.index.actionSnapshots[0].window.hitSnapshots[0].roles['1'].properties.crit_damage=200;
  assert.equal(buildReplayActionCandidate({...mutation,actionIndex:0}).calculation.preHitDamage,300);
});

test('replay adapter selects one conditional damage row from captured live state',()=>{
  const input=fixture(),action=input.index.actionSnapshots[0],snapshot=action.window.hitSnapshots[0];
  input.commands['20']={data_list:{1:{Type:'BEAddState',Target:'CmdCaster',Para:'99,2'},2:{Type:'BEActiveDamage',Target:'UpperTarget',Para:'Arg1',Cond:'CmdCaster.GetStateLayer(99)==0',VFX:{1:7}},3:{Type:'BEActiveDamage',Target:'UpperTarget',Para:'Arg1*2',Cond:'CmdCaster.GetStateLayer(99)>0',DelayTime:'cast'}}};
  snapshot.activeStates=[{ownerUid:1,stateId:99,layer:2,isDeleted:false}];
  action.window.hits[0].data.beHitConfig.castDamage=500;action.window.events[0].data.beHitConfig.castDamage=500;
  const result=buildReplayActionCandidate({...input,actionIndex:0});
  assert.equal(result.identities.rowId,'3');assert.equal(result.scenario.baseValue,200);assert.equal(result.calculation.preHitDamage,500);assert.deepEqual(result.routing.rowSelection.map(item=>item.condition?.passed),[false,true]);
});

test('replay adapter validates max HP plus block target selection from captured enemies',()=>{
  const input=fixture(),action=input.index.actionSnapshots[0],snapshot=action.window.hitSnapshots[0];
  input.commands['20']={data_list:{1:{Type:'BEActiveDamage',Target:'MaxHpAndBlockEnemy',Para:'Arg1'}}};action.window.selectedTargetCommands=[];
  snapshot.roles['4']={uid:4,tid:202,camp:2,roleType:2,properties:{...properties,hp:900,max_hp:1200,block:50}};input.monsters['202']={ID:202,BattleTag:'Elite'};
  const result=buildReplayActionCandidate({...input,actionIndex:0});assert.equal(result.routing.targetBindingSource,'reconstructed-selector-and-recorded-hit');assert.equal(result.routing.selectorValidation.selectedUid,2);
  snapshot.roles['4'].properties.block=200;assert.throws(()=>buildReplayActionCandidate({...input,actionIndex:0}),/HP selector/);
});

test('replay adapter derives Super Ultimate selection from captured caster energy',()=>{
  const input=fixture(),caster=input.index.actionSnapshots[0].window.hitSnapshots[0].roles['1'];
  input.commands['20']={data_list:{1:{Type:'BEActiveDamage',Target:'UpperTarget',Para:'(IsSuperUtlSkill()==1 and Arg1*2 or Arg1)'}}};
  Object.assign(caster,{doubleUltiEnergy:true});Object.assign(caster.properties,{ulti_energy:100,ulti_energy_max:100,ulti_energy_cost_per:0,ulti_energy_cost_flat:0,ulti_energy_max_per:0,ulti_skill_level_up:0});
  const superResult=buildReplayActionCandidate({...input,actionIndex:0});assert.equal(superResult.routing.superUltimateResolution.isSuperUltimate,true);assert.equal(superResult.scenario.baseValue,200);
  caster.properties.ulti_energy=99;const ordinary=buildReplayActionCandidate({...input,actionIndex:0});assert.equal(ordinary.routing.superUltimateResolution.isSuperUltimate,false);assert.equal(ordinary.scenario.baseValue,100);
});

test('replay adapter accepts inspected presentation-only target fields',()=>{
  for(const performTarget of ['CmdTarget','EnemyFieldCenter']){
    const input=fixture();input.commands['20'].data_list['1'].PerformTarget=performTarget;
    assert.equal(buildReplayActionCandidate({...input,actionIndex:0}).scenario.baseValue,100);
  }
  const input=fixture();input.commands['20'].data_list['1'].PerformTarget='PlayerRole';
  assert.throws(()=>buildReplayActionCandidate({...input,actionIndex:0}),/row field/);
});

test('replay adapter accepts only condition-resolved inactive competing damage paths',()=>{
  const input=fixture(),snapshot=input.index.actionSnapshots[0].window.hitSnapshots[0];
  input.commands['20']={data_list:{1:{Type:'BEActiveDamage',Target:'UpperTarget',Para:'Arg1',Cond:'CmdCaster.GetStateLayer(99)==0'},2:{Type:'BEActiveDamage.State',Target:'UpperTarget',Para:'Arg1',Cond:'CmdCaster.GetStateLayer(99)>0'}}};
  const result=buildReplayActionCandidate({...input,actionIndex:0});assert.equal(result.routing.competingDamageSelection[0].condition.passed,false);
  snapshot.activeStates=[{ownerUid:1,stateId:99,layer:1,isDeleted:false}];assert.throws(()=>buildReplayActionCandidate({...input,actionIndex:0}),/competing damage effect/);
  delete input.commands['20'].data_list['2'].Cond;assert.throws(()=>buildReplayActionCandidate({...input,actionIndex:0}),/Unconditional competing/);
});
