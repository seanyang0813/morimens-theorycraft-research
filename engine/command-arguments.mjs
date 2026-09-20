// Numeric ArgN branch only. Null denotes an absent Lua table entry, not zero.
function check(values){
  if(!Array.isArray(values)||!Array.from({length:values.length},(_,i)=>i).every(i=>Object.hasOwn(values,i)&&(values[i]===null||Number.isFinite(values[i]))))throw new Error('Explicit numeric argument array with null for absent entries required');
}
export function resolveCommandArgument({index,skillArgs,readFallback}){
  if(!Number.isSafeInteger(index)||index<1)throw new Error('Positive argument index required');
  check(skillArgs);
  const supplied=skillArgs[index-1];
  if(supplied!==undefined&&supplied!==null)return {value:supplied,source:'skillArgs',index};
  if(typeof readFallback!=='function')throw new Error('Explicit fallback evaluator required for absent argument');
  const fallback=readFallback();check(fallback);
  const resolved=fallback[index-1];
  return {value:resolved??0,source:resolved===undefined||resolved===null?'missing-default':'configPara',index};
}
