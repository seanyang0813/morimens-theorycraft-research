import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runCachedStateTrigger} from '../engine/state-callback.mjs';
const data=JSON.parse(readFileSync(new URL('./synthetic/original-state-callback.json',import.meta.url)));
test('cached unbanned state callbacks match 12 original guard and queue-order cases',()=>{
  for(const {input:v,expected} of data.fixtures){
    const trace=[],triggerData={ignoreDeleted:v.ignoreDeleted};
    const command={clearMemberValues:()=>trace.push('ClearMemberValues'),checkCondition:()=>{trace.push('CheckCondition');return v.judgment;}};
    runCachedStateTrigger({context:{...v,banned:false,relicSource:false,hasJudgment:v.judgment!==null,targetType:'StateOwner',castRoleUid:7,stateUid:88},command,triggerData,
      createEffect:config=>{assert.equal(config.cmdServer,command);assert.equal(command.triggerData,triggerData);if(config.effectType==='BECreateSkillPhase')assert.equal(config.triggerData,triggerData);trace.push(config.effectType);},
      emitEnd:payload=>{assert.deepEqual(payload,{stateUid:88});trace.push('StateTriggerEnd');}});
    assert.deepEqual(trace,expected,JSON.stringify(v));
  }
});
