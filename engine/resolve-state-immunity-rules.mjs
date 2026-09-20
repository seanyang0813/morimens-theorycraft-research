// Resolve recovered classifications/mappings against explicit target properties.
export function resolveStateImmunityRules({catalog,stateId,properties}){
  if(catalog?.build!=='pc-res144-build51'||!Number.isSafeInteger(stateId)||!catalog.stateTypes||!Object.hasOwn(catalog.stateTypes,stateId)||!Array.isArray(catalog.specificRules)||!properties)throw new Error('Known PC144 state and explicit immunity properties required');
  const buffType=catalog.stateTypes[stateId];
  if(!['none','buff','debuff'].includes(buffType))throw new Error('Invalid recovered state classification');
  function value(key){
    if(typeof key!=='string'||!Object.hasOwn(properties,key)||!Number.isFinite(properties[key]))throw new Error(`Missing explicit immunity property: ${key}`);
    return properties[key];
  }
  const broad=Object.fromEntries(['immue_buff','immue_debuff','immue_both_buff'].map(k=>[k,value(k)]));
  const specificRules=catalog.specificRules.map(r=>{
    if(!Array.isArray(r.stateIds)||r.stateIds.some(id=>!Number.isSafeInteger(id)))throw new Error('Invalid recovered state-ID mapping');
    return {property:r.property,stateIds:[...r.stateIds],value:value(r.property)};
  });
  return {buffType,properties:broad,specificRules};
}
