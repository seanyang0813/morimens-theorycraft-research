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
  const target=fixture();target.index.actionSnapshots[0].window.selectedTargetCommands[0].data.uids.push(3);assert.throws(()=>buildReplayActionCandidate({...target,actionIndex:0}),/exactly once/);
  const mutation=fixture();mutation.index.actionSnapshots[0].window.events.unshift({recordIndex:4,frameIndex:1,eventName:'PropertyChanged',data:{uid:1,propertyType:'crit_damage',value:200}});mutation.index.actionSnapshots[0].window.hitSnapshots[0].roles['1'].properties.crit_damage=200;
  assert.equal(buildReplayActionCandidate({...mutation,actionIndex:0}).calculation.preHitDamage,300);
});
