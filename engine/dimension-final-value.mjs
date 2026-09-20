export function applyDimensionFinalValue({value,context}){
  if(!Number.isFinite(value))throw new Error('Finite dimension input required');
  if(!context||['hasCasterUid','hasRole','friendly','hasPlayer'].some(k=>typeof context[k]!=='boolean')||!Number.isFinite(context.percent))throw new Error('Dimension context and explicit player percentage required');
  const trace=[];let percent=0;
  if(value>0&&context.hasCasterUid){
    trace.push('getCaster');
    if(context.hasRole&&context.friendly){
      trace.push('getPlayer');
      if(!context.hasPlayer)throw new Error('Dimension player is missing; original positive-value calculation fails');
      trace.push('dimensionProperty');percent=context.percent;
    }
  }
  const result=Math.ceil(value>0?value*(1+percent/100):value)||0;
  if(!Number.isSafeInteger(result))throw new Error('Dimension result outside exact integer range');
  return {value:result,trace};
}
