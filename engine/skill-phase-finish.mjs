// One AfterEffect pass. The caller owns child execution and EffectEnd timing.
export function finishSkillPhase({command,childrenEmpty,emitFinish,runChildren,endEffect}){
  if(!command||typeof command.isDeleted!=='boolean'||typeof childrenEmpty!=='boolean'||[emitFinish,runChildren,endEffect].some(fn=>typeof fn!=='function'))throw new Error('Explicit command and phase callbacks required');
  if(!childrenEmpty)return runChildren();
  if(command.isDeleted)return endEffect();
  // Original BattleCmdServer.OnEnterFinishPhase and ClearStats.
  command.isDeleted=true;
  // This is the command field, NOT cmdParser.upperTargets used by GetUpperTargets.
  command.upperTargets=[];
  command.stats={};
  emitFinish(command);
  return runChildren();
}
