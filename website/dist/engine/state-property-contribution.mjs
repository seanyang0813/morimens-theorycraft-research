const specialProperties=new Set(['weak_per','frail_per','vulnerable_per']);
const finite=(v)=>{if(!Number.isFinite(v))throw new Error('Finite property value required');return v;};
const ceil=v=>Math.ceil(v)||0;
function specialInput(property,value){
  if(specialProperties.has(property))finite(value);
  else if(value!==null)throw new Error('Ordinary property requires explicit null special value');
}

// Single non-card property contribution. Returned deltas still need recipient routing
// and actual property-server mutation. Special values must be resolved by the caller.
export function initializeStateProperty({property,expression,evaluate,specialValue,skipInit}){
  if(typeof property!=='string'||!property||typeof expression!=='string'||typeof evaluate!=='function'||typeof skipInit!=='boolean')throw new Error('Explicit state property initialization required');
  specialInput(property,specialValue);
  const base=finite(evaluate(expression)),special=specialValue??0;
  const value=finite(ceil(base+special));
  return {contribution:{property,expression,value,changeByLayer:expression.includes('ChangedLayer'),specialMaximum:specialValue},
    requestedDelta:skipInit?null:value,trace:{base,special,rounded:value,skipInit}};
}

export function updateStateProperty({contribution,changedLayer,evaluate,specialValue}){
  const c=contribution;
  if(!c||typeof c.property!=='string'||typeof c.expression!=='string'||typeof c.changeByLayer!=='boolean'||typeof evaluate!=='function')throw new Error('Explicit stored contribution required');
  finite(c.value);finite(changedLayer);specialInput(c.property,specialValue);specialInput(c.property,c.specialMaximum);
  let delta=null,specialMaximum=c.specialMaximum,branch='unchanged';
  if(changedLayer>0&&specialProperties.has(c.property)){
    specialMaximum=Math.max(c.specialMaximum,specialValue);
    delta=Math.max(0,specialMaximum-c.specialMaximum);
    branch='specialIncrease';
  }else if(c.changeByLayer){delta=finite(ceil(finite(evaluate(c.expression))));branch='layerExpression';}
  const value=finite(c.value+(delta??0));
  return {contribution:{...c,value,specialMaximum},requestedDelta:delta,trace:{branch,before:c.value,delta,after:value}};
}
