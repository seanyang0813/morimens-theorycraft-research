// BERoleDeadlyDamage.DoEffect control flow. emit MUST finish child effects before
// returning; ordinary deferred enqueue is not equivalent for this special effect.
export function runDeadlyDamage({role,emit,floatingText}){
  if(typeof emit!=='function'||typeof floatingText!=='function')throw new Error('Synchronous event and floating-text callbacks required');
  if(!role)return false;
  if(['hp','isDeathResist','deathResist','revivePopup'].some(key=>typeof role[key]!=='function'))throw new Error('Explicit role adapters required');
  emit('RoleBeforeDeathResist');
  if(role.hp()>0){floatingText();return false;}
  if(role.isDeathResist()){
    role.deathResist();emit('RoleAfterDeathResist');return false;
  }
  emit('RoleBeforeDeath');
  if(role.hp()>0){if(role.revivePopup()<=0)floatingText();return false;}
  emit('RoleAfterDeath');
  return false;
}
