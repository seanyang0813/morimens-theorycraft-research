const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));

export function evaluateWheelRefinementExpression(expression,refinementLevel){
  if(typeof expression!=='string'||!Number.isSafeInteger(refinementLevel)||refinementLevel<0||refinementLevel>3)throw new Error('Explicit Wheel refinement expression and level 0 through 3 required');
  const compact=expression.replaceAll(' ','');
  const match=/^(-?(?:\d+(?:\.\d+)?|\.\d+))(?:(\+GetRefiningLevel\(\))(?:\*(-?(?:\d+(?:\.\d+)?|\.\d+)))?)?$/.exec(compact);
  if(!match)throw new Error('Unsupported Wheel refinement expression');
  const base=Number(match[1]),usesLevel=Boolean(match[2]),slope=usesLevel?(match[3]===undefined?1:Number(match[3])):0,value=base+refinementLevel*slope;
  if(![base,slope,value].every(Number.isFinite))throw new Error('Finite Wheel refinement arithmetic required');
  return {expression,refinementLevel,base,usesLevel,slope,value};
}

export function resolveWheelRefinementParameters(input){
  const fields=['schemaVersion','kind','build','wheelId','refinementLevel','parameters'];
  if(!exact(input,fields)||input.schemaVersion!==1||input.kind!=='morimens-wheel-refinement-parameters'||input.build!=='pc-res144-build51'||typeof input.wheelId!=='string'||!input.wheelId||!input.parameters||typeof input.parameters!=='object'||Array.isArray(input.parameters))throw new Error('Exact resource-144 Wheel refinement parameter input required');
  const entries=Object.entries(input.parameters);
  if(entries.length<1||entries.some(([slot,expression])=>!/^StateArg[1-9]\d*$/.test(slot)||typeof expression!=='string'))throw new Error('One or more named StateArg expressions required');
  const trace=entries.map(([slot,expression])=>({slot,...evaluateWheelRefinementExpression(expression,input.refinementLevel)}));
  return {schemaVersion:1,kind:'morimens-wheel-refinement-parameters-result',analysisTrack:'mechanics',status:'ORIGINAL_RUNTIME_MATCHED_PARAMETER_ARITHMETIC',build:input.build,wheelId:input.wheelId,refinementLevel:input.refinementLevel,values:Object.fromEntries(trace.map(row=>[row.slot,row.value])),trace,finalDamage:null,limitations:['Parameter arithmetic only; no equipment, state attachment, direct-property mutation, trigger, target, stacking or gameplay execution','The caller supplies source-bound expressions; this result does not infer a Wheel from name alone','This mechanics result is not a theorycraft recommendation, cheese, budget-scouting, gameplay-validation or holdout result']};
}
