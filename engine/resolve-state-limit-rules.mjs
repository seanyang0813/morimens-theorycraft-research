// Map source-derived property names to explicit values; never guess absent stats.
export function resolveStateLimitRules({catalog,properties}){
  if(catalog?.build!=='pc-res144-build51'||!catalog.rules||!properties||Array.isArray(properties))throw new Error('PC144 limit catalog and explicit properties required');
  const result={statistics:[],total:[]};
  for(const mode of Object.keys(result)){
    if(!Array.isArray(catalog.rules[mode]))throw new Error('Explicit limit families required');
    for(const row of catalog.rules[mode]){
      if(!Array.isArray(row.stateIds)||row.stateIds.some(id=>!Number.isSafeInteger(id))||typeof row.limitProperty!=='string'||!Object.hasOwn(properties,row.limitProperty)||!Number.isFinite(properties[row.limitProperty]))throw new Error('Missing or invalid limit property');
      const rule={stateIds:[...row.stateIds],limit:properties[row.limitProperty]};
      if(mode==='statistics'){
        if(typeof row.usedProperty!=='string'||!Object.hasOwn(properties,row.usedProperty)||!Number.isFinite(properties[row.usedProperty]))throw new Error('Missing explicit usage property; accumulation is unresolved');
        rule.used=properties[row.usedProperty];
      }
      result[mode].push(rule);
    }
  }
  return result;
}
