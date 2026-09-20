// No caster attribution map; lifecycle outputs describe calls, not their execution.
export function subtractStateLayer({layers,amount,exists,casterAttribution}){
  if(!Number.isSafeInteger(layers)||layers<0||typeof exists!=='boolean'||casterAttribution!=='absent'||(amount!==null&&(typeof amount!=='number'||!Number.isFinite(amount))))throw new Error('Explicit layers, amount/null, existence and absent caster attribution required');
  const requested=Math.ceil(Math.abs(amount===null?1:amount));
  if(!Number.isSafeInteger(requested))throw new Error('Unsupported stack subtraction size');
  const layersAfter=exists?Math.max(0,layers-requested):layers,changedLayer=layersAfter-layers;
  const trace=exists?[{event:'propertyDelta',value:changedLayer},{event:'record'},{event:'log'},...(layersAfter===0?[{event:'lifeEnd'}]:[])]:[];
  return {status:'EXPERIMENTAL',finalDamage:null,requested,layersAfter,changedLayer,trace,
    unresolvedDependencies:['Caster layer attribution excluded','Property propagation and actual LifeEnd/removal events are not executed','Independent gameplay validation']};
}
