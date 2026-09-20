// Recovered DoDamageEvent ordering. Callers own event scheduling/listeners and death handling.
// The payload remains live: the original passes the same object to successive event requests.
export function runDamageEvents({payload,isBattleFinished,emit,checkDeath,getHp,isFightBack}){
  if(!payload||!['Active','Passive','Fixed','Pure','Tentacle'].includes(payload.damageType)||
     [isBattleFinished,emit,checkDeath,getHp,isFightBack].some(fn=>typeof fn!=='function'))throw new Error('Explicit event adapters and damage payload required');
  if(isBattleFinished())return;
  if(payload.isPreventActiveDamage){
    emit('DoPreventedActiveDamage',payload);
    emit('PreventBeActiveDamage',payload);
  }
  if(['Active','Passive','Pure','Fixed'].includes(payload.damageType))emit('DoDamage',payload);
  else if(payload.damageType==='Tentacle'){
    emit('TentacleAttack',payload);emit('AttackedByTentacle',payload);emit('DoTentacleDamage',payload);
  }
  emit('BeDamage',payload);
  if(payload.pvp_death_resist)emit('PVPDeathResist',payload);
  checkDeath(payload.castRoleUid,payload.fromCmdServerUid,payload.hpChangeReason,payload);
  if(getHp()<=0){
    if(payload.damageType==='Active')emit('ActiveDamageKill',payload);
    if(payload.damageType==='Fixed')emit('FixedDamageKill',payload);
    if(payload.isCrit)emit('CritKill',payload);
    if(payload.damageType==='Passive'&&isFightBack(payload.stateId))emit('FightBackKill',payload);
  }
}
