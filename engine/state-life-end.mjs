// Original LifeEnd call order; property effects and queued event execution belong to adapters.
export function endStateLife({state,teamUnique,removeUniqueStateRole,removeProperty,onDelState,log,createStateLifeEnd}){
  if(!state||typeof state.isDeleted!=='boolean'||typeof teamUnique!=='boolean'||[removeUniqueStateRole,removeProperty,onDelState,log,createStateLifeEnd].some(fn=>typeof fn!=='function'))throw new Error('Explicit state lifecycle and side-effect adapters required');
  if(state.isDeleted)return false;
  state.isDeleted=true;
  if(teamUnique)removeUniqueStateRole(state);
  removeProperty(state);onDelState(state);log(state);createStateLifeEnd({stateUid:state.uid});
  return true;
}
