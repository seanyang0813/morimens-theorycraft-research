// PC144 GetMatchTQ + scalar GetTQText. Does not classify conditional tables.
export function selectProgressionVariant({variants,breakSkillLevel,potencyLevel}){
  for(const level of [breakSkillLevel,potencyLevel])if(!Number.isSafeInteger(level)||level<0)throw new Error('Explicit nonnegative integer progression levels required');
  if(!variants||Array.isArray(variants)||typeof variants!=='object')throw new Error('Explicit scalar progression map required');
  let breakThreshold=0,potencyThreshold=0;
  for(const [key,value] of Object.entries(variants)){
    if(!/^(0|[1-9]\d*)$/.test(key)||!Number.isSafeInteger(Number(key))||!(Number.isFinite(value)||typeof value==='string'))throw new Error('Scalar numeric/string variants with canonical nonnegative keys required; conditional tables are unsupported');
    const requiredBreak=Math.floor(Number(key)/1000),requiredPotency=Number(key)%1000;
    if(breakSkillLevel>=requiredBreak&&breakThreshold<requiredBreak)breakThreshold=requiredBreak;
    if(potencyLevel>=requiredPotency&&potencyThreshold<requiredPotency)potencyThreshold=requiredPotency;
  }
  const matchKey=breakThreshold*1000+potencyThreshold;
  if(!Number.isSafeInteger(matchKey))throw new Error('Progression key exceeds supported integer range');
  const found=Object.hasOwn(variants,String(matchKey));
  return {build:'pc-res144-build51',status:found?'VARIANT_SELECTED':'MISSING_VARIANT',matchKey,value:found?variants[String(matchKey)]:null,found,breakThreshold,potencyThreshold};
}
