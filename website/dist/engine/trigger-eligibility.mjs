export function stateTriggerEligible(input){
  const keys=['deleted','monster','enemy','ownerUid','ownerCamp','triggerCamp','roleUid'];
  if(!input||keys.some(k=>!Object.hasOwn(input,k))||Object.keys(input).some(k=>!keys.includes(k)))throw new Error('Explicit state-trigger context required');
  if(['deleted','monster','enemy'].some(k=>typeof input[k]!=='boolean')||['ownerUid','ownerCamp','triggerCamp'].some(k=>!Number.isSafeInteger(input[k]))||(input.roleUid!==null&&!Number.isSafeInteger(input.roleUid)))throw new Error('Invalid state-trigger context');
  if(input.deleted)return false;
  // A numeric zero is truthy in Lua; only explicit null means no supplied role UID.
  if(input.roleUid!==null&&input.monster)return input.ownerUid===input.roleUid;
  return input.enemy?input.ownerCamp!==input.triggerCamp:input.ownerCamp===input.triggerCamp;
}
