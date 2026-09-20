import {finishSkillPhase} from './skill-phase-finish.mjs';

export function startSkillPhase({command,skipPhase,skipTimeline,triggerData,getTime,afterCreate}){
  if(!command||typeof skipPhase!=='boolean'||typeof skipTimeline!=='boolean'||typeof getTime!=='function'||typeof afterCreate!=='function')throw new Error('Explicit phase context required');
  for(const method of ['setIsDeleted','getUpperTargets','getSkillCastTime','onEnterBeforePhase','sendTimeline','triggerCmd'])if(typeof command[method]!=='function')throw new Error('Missing command method: '+method);
  command.setIsDeleted(false);
  const targets=command.getUpperTargets(),beginTime=getTime();
  if(!skipPhase){command.getSkillCastTime();command.onEnterBeforePhase(targets);}
  command.sendTimeline(skipTimeline);
  command.triggerCmd(triggerData,skipPhase);
  afterCreate();
  return {beginTime};
}

// Non-yielding composition. Target generation happens before calling this helper.
// Event hooks enqueue their effects on the supplied scheduler; end handles timing.
export function enqueueSkillPhase({scheduler,start,emitFinish,endEffect}){
  if(!scheduler||typeof scheduler.enqueue!=='function'||typeof emitFinish!=='function'||typeof endEffect!=='function')throw new Error('Explicit scheduler and phase-end adapters required');
  const result={status:'EXPERIMENTAL',finalDamage:null,beginTime:null};
  scheduler.enqueue(()=>{
    result.beginTime=startSkillPhase(start).beginTime;
    scheduler.enqueue(()=>finishSkillPhase({command:start.command,childrenEmpty:true,emitFinish,
      runChildren:()=>scheduler.enqueue(()=>endEffect(result.beginTime)),
      endEffect:()=>endEffect(result.beginTime)}));
  });
  return result;
}
