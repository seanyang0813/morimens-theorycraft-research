const crit=new Set(['crit','crit_per_from_ulti','crit_per_from_strikecard','card_crit']);
const critDamage=new Set(['crit_damage','card_crit_damage','crit_damage_from_strikecard','crit_damage_from_ulti']);
export const combatMutableProperties=Object.freeze(['basic_damage_per','be_damage_per','be_damage_per2','be_damage_per3','vulnerable_per','weak_per','frail_per',...crit,...critDamage]);

// Only non-resource properties without cascading refresh branches. Callback payloads
// are exposed for dispatch by the caller; this does not execute event listeners.
export function changeCombatProperty({property,before,delta,critScale,critDamageScale,castValue}){
  if(!combatMutableProperties.includes(property))throw new Error('Unsupported combat property; resource and derived-property branches require separate handling');
  if(![before,delta,critScale,critDamageScale].every(Number.isFinite)||!(castValue===null||Number.isFinite(castValue)))throw new Error('Explicit finite property values and amplification required');
  const cast=castValue??delta;
  if(delta===0)return {after:before,returned:null,castValue:cast,callbacks:[]};
  let applied=delta;
  if(delta>0&&(crit.has(property)||critDamage.has(property))){
    const scale=crit.has(property)?critScale:critDamageScale;
    applied=Math.ceil(delta*(100+scale)/100)||0;
  }
  const after=before+applied;
  if(!Number.isFinite(after))throw new Error('Combat property overflow');
  return {after,returned:after,castValue:cast,callbacks:[{kind:'owner',property,old:before,new:after},{kind:'send',property,delta:applied,new:after}]};
}
