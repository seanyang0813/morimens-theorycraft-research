// Cmd80572 and Cmd81060 share these eight rows. The caller must execute each
// yielded effect AND its descendants before requesting the next command row.
// Role/caster death checks, target eligibility and battle finish are external.
export function* oldEmbersEffectSteps({argument,getStateLayer}){
  if(!Number.isFinite(argument)||argument<0||!Number.isFinite(argument*3)||typeof getStateLayer!=='function')throw new Error('Explicit finite argument and live state getter required');
  const layer=id=>{
    const value=getStateLayer(id);
    if(!Number.isSafeInteger(value)||value<0||value>999999999)throw new Error(`Unresolved state ${id}`);
    return value;
  };
  const allowed=marker=>layer(marker)>0&&layer(66314)===0&&layer(62317)===0;
  if(layer(80575)>=argument)yield {row:1,type:'addState',stateId:80593,layers:1};
  if(layer(80575)<argument)yield {row:2,type:'addState',stateId:80594,layers:1};
  if(allowed(80593))yield {row:3,type:'changeHp',rawValue:-3*argument};
  if(allowed(80593))yield {row:4,type:'subtractState',stateId:80575,rawAmount:argument};
  if(allowed(80594))yield {row:5,type:'changeHp',rawValue:-3*layer(80575)};
  if(allowed(80594))yield {row:6,type:'removeState',stateId:80575};
  yield {row:7,type:'removeState',stateId:80593};
  yield {row:8,type:'removeState',stateId:80594};
}
