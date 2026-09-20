export function getLiveStateLayer({registry,ownerUid,stateId}){
  if(!(registry instanceof Map)||!(ownerUid===null||Number.isSafeInteger(ownerUid))||!Number.isSafeInteger(stateId))throw new Error('Explicit registry and target/state identity required');
  if(ownerUid===null)return 0;
  const list=registry.get(ownerUid);
  if(list===undefined)return 0;
  if(!Array.isArray(list))throw new Error('State registry list required');
  for(const state of list){
    if(!state||typeof state.isDeleted!=='boolean'||!Number.isSafeInteger(state.stateId))throw new Error('Explicit state identity/deletion required');
    if(!state.isDeleted&&state.stateId===stateId){if(!Number.isFinite(state.layer))throw new Error('Finite live layer required');return state.layer;}
  }
  return 0;
}
