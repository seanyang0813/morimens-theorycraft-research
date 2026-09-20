// This selection gate differs from BattleCmdServer.CheckCondition: positive
// numeric results match here. Only dense, scalar-valued conditional lists.
export function selectConditionalVariant({variants,evaluate}){
  if(!Array.isArray(variants)||!Array.from({length:variants.length},(_,i)=>i).every(i=>Object.hasOwn(variants,i)))throw new Error('Dense conditional variant list required');
  for(const row of variants)if(!row||Object.keys(row).some(key=>!['condition','value'].includes(key))||!['boolean','string'].includes(typeof row.condition)||!(Number.isFinite(row.value)||typeof row.value==='string'))throw new Error('Explicit boolean/expression condition and scalar variant value required');
  const trace=[];
  for(let i=variants.length-1;i>=0;i--){
    const row=variants[i];let result;
    if(typeof row.condition==='boolean')result=row.condition;
    else if(row.condition==='true')result=true;
    else {if(typeof evaluate!=='function')throw new Error('Explicit condition evaluator required');result=evaluate(row.condition);}
    if(result!==null&&typeof result!=='boolean'&&!Number.isFinite(result))throw new Error('Unresolved condition result; only explicit nil, boolean or finite number supported');
    const matched=typeof result==='number'?result>0:result===true;
    trace.push({index:i+1,condition:row.condition,result,matched});
    if(matched)return {status:'VARIANT_SELECTED',index:i+1,value:row.value,trace};
  }
  return {status:'NO_MATCHING_VARIANT',index:null,value:null,trace};
}
