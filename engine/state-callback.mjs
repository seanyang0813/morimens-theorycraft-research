// Cached-command, unbanned, non-relic State.Trigger subset. First construction and
// ban allowlists are deliberately unsupported; callers must supply their context.
export function runCachedStateTrigger({context:c,command,triggerData,createEffect,emitEnd}){
  if(!c||c.banned!==false||c.relicSource!==false||!command||typeof command.clearMemberValues!=='function'||typeof command.checkCondition!=='function'||typeof createEffect!=='function'||typeof emitEnd!=='function'||!triggerData)throw new Error('Explicit supported cached-state context and callbacks required');
  if(['deleted','card','dead','prohibitDead','configured','commandExists','hasJudgment'].some(k=>typeof c[k]!=='boolean')||!Number.isFinite(c.hidden)||!Number.isSafeInteger(c.castRoleUid)||!Number.isSafeInteger(c.stateUid)||typeof c.targetType!=='string')throw new Error('Incomplete cached-state context');
  if(c.hidden>0)return false;
  if(c.deleted&&!triggerData.ignoreDeleted)return false;
  if(!c.card&&c.dead&&c.prohibitDead)return false;
  if(!c.configured)return false;
  command.clearMemberValues();command.triggerData=triggerData;
  if(!c.commandExists)return false;
  if(c.hasJudgment){
    const result=command.checkCondition();
    if(result===false||result==null||result===0)return false;
  }
  createEffect({effectType:'BEGenerateTargets',cmdServer:command,targetType:c.targetType,castRoleUid:c.castRoleUid});
  createEffect({effectType:'BECreateSkillPhase',cmdServer:command,triggerData});
  emitEnd({stateUid:c.stateUid});
  return true;
}
