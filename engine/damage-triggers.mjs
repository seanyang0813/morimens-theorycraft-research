// Handler-body reconstruction only. Registration, TryTrigger and Trigger execution
// belong to the caller. Tentacle must be registered on AttackedByTentacle, not BeDamage.
export function damageTriggerPayload({handler,event,mode,target,caster,tryTrigger}){
  const categories={BSTAfterBeActiveDamage:'Active',BSTAfterPassiveDamage:'Passive',BSTAfterFixedDamage:'Fixed',BSTAfterAttackedByTentacle:'Tentacle'};
  if(!Object.hasOwn(categories,handler)||!event||!target||typeof tryTrigger!=='function'||!['None','Unblocked','CritDamage'].includes(mode))throw new Error('Explicit trigger handler, event and role adapters required');
  if(!tryTrigger(target.camp,event.targetRoleUid))return null;
  const tentacle=handler==='BSTAfterAttackedByTentacle',fixed=handler==='BSTAfterFixedDamage';
  // Original Tentacle handler trusts its event registration; it has no type check.
  if(!tentacle&&event.damageType!==categories[handler])return null;
  let value=event.castDamage;
  if(!tentacle&&!fixed){
    if(mode==='Unblocked'){
      if(event.realDamage<=0)return null;
      value=event.unBlockedDamage;
    }else if(mode==='CritDamage'){
      if(!event.isCrit)return null;
      value=event.realDamage;
    }
  }
  if(tentacle)return {triggerValue:value,associator:[target]};
  const result={triggerValue:value,associator:caster?[caster]:[],associator2:[target]};
  if(handler==='BSTAfterBeActiveDamage')Object.assign(result,{triggerValue2:event.blockedDamage,triggerValue3:event.realDamage});
  if(fixed)result.triggerValue2=event.realDamage;
  return result;
}
