import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBlindReplayPrediction} from '../engine/replay-blind-prediction.mjs';

const properties={hp:1000,max_hp:1000,block:0,crit:0,crit_damage:150};
const fixture=castDamage=>({
  index:{kind:'MORIMENS_REPLAY_EVENT_INDEX',build:'pc-res144-build51',actionSnapshots:[{actionIndex:0,boundaryStatus:'COMPLETE',cardUid:30,camp:1,
    roles:{'1':{uid:1,tid:101,camp:1,roleType:1,breakSkillLevel:0,potencyLevel:0,properties:{...properties,crit:0}},'2':{uid:2,tid:201,camp:2,roleType:2,properties:{...properties}},'3':{uid:3,tid:0,camp:1,roleType:3,properties:{...properties}}},
    cards:{'30':{uid:30,tid:10,ownerUid:1,camp:1,cardArgs:{1:100},properties:{crit:0}}},activeStates:[],window:{selectedTargetCommands:[{data:{uids:[2]}}],hits:[{recordIndex:4,frameIndex:2,data:{roleUid:2,beHitConfig:{castRoleUid:1,skillConfigId:10,castDamage,isCrit:false,oldHp:1000,blockLose:0}}}],
      hitSnapshots:[{hitIndex:0,recordIndex:4,frameIndex:2,boundaryStatus:'COMPLETE',roles:{'1':{uid:1,tid:101,camp:1,roleType:1,breakSkillLevel:0,potencyLevel:0,properties:{...properties,crit:0}},'2':{uid:2,tid:201,camp:2,roleType:2,properties:{...properties,hp:900}},'3':{uid:3,tid:0,camp:1,roleType:3,properties:{...properties}}},cards:{'30':{uid:30,tid:10,ownerUid:1,camp:1,cardArgs:{1:100},properties:{crit:0}}},activeStates:[],hitData:{roleUid:2,beHitConfig:{castRoleUid:1,skillConfigId:10,castDamage,isCrit:false,oldHp:1000,blockLose:0}},reconstruction:{targetHp:'outcome'}}]}}]},
  skills:{'10':{ID:10,CmdList:20,Type:{1:'Card_Strike'}}},commands:{'20':{data_list:{1:{Type:'BEActiveDamage',Target:'UpperTarget',Para:'Arg1'}}}},monsters:{'201':{ID:201,BattleTag:'Boss'}},awakeners:{'101':{ID:101,School:1}}
});

test('blind replay prediction is invariant to hidden damage and restores pre-action target HP',()=>{
  const a=buildBlindReplayPrediction(fixture(250)),b=buildBlindReplayPrediction(fixture(999999));
  assert.equal(a.predictedDamage,100);assert.equal(a.scenario.targetProperties.hp,1000);
  assert.equal(a.sealedProjectionSha256,b.sealedProjectionSha256);
  assert.equal(a.routing.targetBindingSource,'single-living-enemy-preoutcome');
  assert.equal(JSON.stringify(a).includes('999999'),false);
});

test('blind replay prediction rejects chance-dependent critical outcomes',()=>{
  const input=fixture(250);input.index.actionSnapshots[0].roles['1'].properties.crit=50;input.index.actionSnapshots[0].window.hitSnapshots[0].roles['1'].properties.crit=50;
  assert.throws(()=>buildBlindReplayPrediction(input),/No blind deterministic replay candidate/);
});
