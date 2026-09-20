import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {startSkillPhase,enqueueSkillPhase} from '../engine/skill-phase.mjs';
import {ResearchEffectOrder} from '../engine/effect-order.mjs';
const data=JSON.parse(readFileSync(new URL('./synthetic/original-skill-phase-start.json',import.meta.url)));
test('phase start order and payload forwarding match original DoEffect',()=>{
  for(const {input,expected} of data.fixtures){
    const trace=[],targets={token:7},payload={token:42};
    const command={setIsDeleted:v=>trace.push(['SetIsDeleted',v]),getUpperTargets:()=>{trace.push(['GetUpperTargets']);return targets;},
      getSkillCastTime:()=>trace.push(['GetSkillCastTime']),onEnterBeforePhase:t=>{assert.equal(t,targets);trace.push(['OnEnterBeforePhase',t.token]);},
      sendTimeline:v=>trace.push(['SendNotAwakerTimeline',v]),triggerCmd:(p,s)=>{assert.equal(p,payload);trace.push(['TriggerCmd',p.token,s]);}};
    const result=startSkillPhase({...input,command,triggerData:payload,getTime:()=>{trace.push(['GetCurPassTime']);return 10;},afterCreate:()=>trace.push(['AfterCreateSkillPhase'])});
    assert.equal(result.beginTime,10);assert.deepEqual({returned:true,trace},expected);
  }
});
test('code-derived phase composition drains command and finish descendants before ending',()=>{
  const scheduler=new ResearchEffectOrder(),trace=[];
  const command={isDeleted:true,upperTargets:[],cmdParser:{upperTargets:[7]},stats:{damage:200},setIsDeleted(v){this.isDeleted=v;},getUpperTargets(){return this.cmdParser.upperTargets;},
    getSkillCastTime(){},onEnterBeforePhase(){trace.push('before');},sendTimeline(){},
    triggerCmd(){scheduler.enqueue(()=>{trace.push('command');scheduler.enqueue(()=>trace.push('command child'));});}};
  enqueueSkillPhase({scheduler,start:{command,skipPhase:false,skipTimeline:false,triggerData:{},getTime:()=>10,afterCreate:()=>scheduler.enqueue(()=>trace.push('after-create'))},
    emitFinish:c=>{assert.equal(c.isDeleted,true);assert.deepEqual(c.stats,{});scheduler.enqueue(()=>trace.push('finish child'));},
    endEffect:t=>{assert.equal(t,10);trace.push('end');}});
  scheduler.run();
  assert.deepEqual(trace,['before','command','command child','after-create','finish child','end']);
  assert.deepEqual(command.getUpperTargets(),[7]);
});
