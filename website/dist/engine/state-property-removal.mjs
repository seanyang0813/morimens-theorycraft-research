// One stored contribution; outputs requested mutations, not applied property values.
export function statePropertyRemoval({property,storedValue,apiType,pve,playerOwner,banned,ignoreBan,owner,awakeners}){
  if(typeof property!=='string'||!property||typeof storedValue!=='number'||!Number.isFinite(storedValue)||![pve,playerOwner,banned,ignoreBan].every(x=>typeof x==='boolean')||!['AWAKER_ATTR','OTHER'].includes(apiType)||!Array.isArray(awakeners)||owner===undefined)throw new Error('Explicit state contribution and routing context required');
  const recipients=banned&&!ignoreBan?[]:pve&&playerOwner&&apiType==='AWAKER_ATTR'?awakeners:[owner];
  return {status:'EXPERIMENTAL',finalDamage:null,storedValueAfter:storedValue,mutations:recipients.map(recipient=>({recipient,property,delta:-storedValue})),
    unresolvedDependencies:['Non-card single-property scope; multi-property iteration order not modeled','Recipient ChangeProperty and its callbacks must execute separately','State deletion/idempotence handled by lifecycle, not this operation','Independent gameplay validation']};
}
