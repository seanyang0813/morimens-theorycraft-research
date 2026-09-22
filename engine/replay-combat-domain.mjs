const roleTypeNames={1:'Awakener',2:'Monster',3:'Player'};

export function classifyReplayCombatDomain(index,context={}){
  if(!index||index.kind!=='MORIMENS_REPLAY_EVENT_INDEX'||!Array.isArray(index.actionSnapshots))throw new Error('Replay event index required');
  const targetRoleTypes={};let completeHitSnapshots=0;
  for(const action of index.actionSnapshots){
    const hits=action.window?.hits??[];
    for(const snapshot of action.window?.hitSnapshots??[]){
      if(snapshot.boundaryStatus!=='COMPLETE')continue;
      completeHitSnapshots++;
      const matching=hits.find(item=>item.recordIndex===snapshot.recordIndex&&item.frameIndex===snapshot.frameIndex);
      const target=snapshot.roles?.[String(matching?.data?.roleUid)];
      const label=Number.isSafeInteger(target?.roleType)?(roleTypeNames[target.roleType]??`ProtocolRoleType${target.roleType}`):'Unknown';
      targetRoleTypes[label]=(targetRoleTypes[label]??0)+1;
    }
  }
  const labels=Object.keys(targetRoleTypes).filter(key=>targetRoleTypes[key]>0);
  const battleDat=context?.battleDat,battleConfig=context?.battleConfig;
  const configuredPve=Number.isSafeInteger(battleDat?.battleTid)&&battleConfig?.ID===battleDat.battleTid&&battleConfig.BattleType==='Boss'&&Object.entries(battleConfig).some(([key,value])=>/^Monster\d+$/.test(key)&&Number.isSafeInteger(value)&&value>0);
  const combatDomain=configuredPve?'PVE_MONSTER_TARGETS':labels.length===1&&labels[0]==='Monster'?'PVE_MONSTER_TARGETS':labels.length===1&&labels[0]==='Player'?'PVP_PLAYER_TARGETS':'MIXED_OR_UNKNOWN_TARGETS';
  const classificationBasis=configuredPve?'REPLAY_EMBEDDED_BOSS_CONFIG_WITH_MONSTER':'COMPLETE_HIT_TARGET_ROLE_TYPES';
  const inputSha256=typeof index.inputSha256==='string'&&/^[0-9a-f]{64}$/.test(index.inputSha256)?index.inputSha256:null;
  return {schemaVersion:1,kind:'MORIMENS_REPLAY_COMBAT_DOMAIN',inputSha256,combatDomain,classificationBasis,completeHitSnapshots,targetRoleTypes,battleTid:configuredPve?battleDat.battleTid:null,battleType:configuredPve?battleConfig.BattleType:null,
    scope:configuredPve?'Outcome-free PvE routing from matching replay-embedded Boss configuration with a declared Monster; hit target types retained for audit':'Outcome-free fallback routing from complete hit target role types; no stage, difficulty, strategy or build claim'};
}
