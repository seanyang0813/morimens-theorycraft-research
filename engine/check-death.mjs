// Recovered CheckDeathEvent. createEffect controls immediate/deferred scheduling.
export function checkDeathEvent({role,castRoleUid,fromCmdServerUid,hpChangeReason,loseHpConfig,createEffect}){
  if(!role||['eligible','hp','isDead'].some(k=>typeof role[k]!=='function')||typeof createEffect!=='function')throw new Error('Explicit role and effect-creation adapters required');
  if(!role.eligible()||role.hp()>0||role.isDead())return;
  const deadly={effectType:'BERoleDeadlyDamage',roleUid:role.uid,castRoleUid,fromCmdServerUid,hpChangeReason};
  if(loseHpConfig){
    if(loseHpConfig.castDamage!==undefined)deadly.castDamage=loseHpConfig.castDamage;
    if(loseHpConfig.overflowDamage!==undefined)deadly.overflowDamage=loseHpConfig.overflowDamage;
  }
  createEffect(deadly);
  createEffect({effectType:'BERoleDie',roleUid:role.uid,fromCmdServerUid,hpChangeReason});
}
