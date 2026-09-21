// PC144 ordinary owner callback. Queue consumers must preserve payload identity.
export function enqueueHpPropertyEvents(input,enqueue){
  const {property,old,new:next,hp,max_hp,uid,castRoleUid}=input;
  if(!['hp','max_hp'].includes(property)||[old,next,hp,max_hp,uid,castRoleUid].some(v=>!Number.isFinite(v))||typeof enqueue!=='function')throw new Error('Explicit HP callback metadata and enqueue function required');
  const data={uid,oldValue:old,newValue:next,castRoleUid};
  if(property==='hp')enqueue(203,data);
  data.max_hp=max_hp;data.hp=hp;data.propertyName=property;
  enqueue(204,data);
}

export function createEventEffectRequest({eventId,eventData,autoBattle}){
  if(!Number.isFinite(eventId)||typeof autoBattle!=='boolean'||(eventData!==undefined&&(!eventData||typeof eventData!=='object'||Array.isArray(eventData))))throw new Error('Explicit event ID, object payload and auto-operation flag required');
  const data=eventData??{};
  if(data.isAutoOp===undefined)data.isAutoOp=autoBattle;
  else if(typeof data.isAutoOp!=='boolean')throw new Error('isAutoOp must be boolean when supplied');
  return {effectType:'BESendEvent',eventId,eventData:data};
}
