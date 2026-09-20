// Numeric subset of BattlePropertyServer.ctor. Subsequent hooks are separate.
export function initializeNumericProperties(input){
  if(!input||Array.isArray(input)||Object.getPrototypeOf(input)!==Object.prototype)throw new Error('Explicit numeric property map required');
  const properties={},trace=[];
  for(const [key,value] of Object.entries(input)){
    if(['__proto__','constructor','prototype'].includes(key)||!Number.isFinite(value))throw new Error('Finite numeric properties with ordinary keys required');
    properties[key]=Math.ceil(value);trace.push({property:key,supplied:value,stored:properties[key],operation:'ceil'});
  }
  return {status:'EXPERIMENTAL',properties,trace,evidence:['PC144:PropertyInitialization'],unresolvedDependencies:['Role construction and initial property provenance','Post-construction hooks and independent gameplay validation']};
}
