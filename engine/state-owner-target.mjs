// Raw StateOwner target list only; target-expression wrapping/filtering is separate.
export function stateOwnerTargets({stateUid,getState,onMissingState}){
  if((stateUid!==null&&!Number.isSafeInteger(stateUid))||typeof getState!=='function'||typeof onMissingState!=='function')throw new Error('Explicit StateOwner lookup context required');
  if(stateUid===null)return [];
  const state=getState(stateUid);
  if(!state){onMissingState(stateUid);return [];}
  return state.owner==null?[]:[state.owner];
}
