// PC res144 build51 AwakerUpgrade primary-stat formula, retaining operation order.
// Requires already-resolved upgrade level (including the quality offset).
export function calculateClientPrimaryStat(input){
  const fields=['build','base','extra','upgradeLevel','talentBonusLevels'];
  if(!input||fields.some(k=>!Object.hasOwn(input,k))||Object.keys(input).some(k=>!fields.includes(k)))throw new Error('Explicit client primary-stat inputs required');
  if(input.build!=='pc-res144-build51')throw new Error('Unsupported client build');
  for(const key of ['base','extra'])if(typeof input[key]!=='number'||!Number.isFinite(input[key]))throw new Error(`Finite ${key} required`);
  for(const key of ['upgradeLevel','talentBonusLevels'])if(!Number.isSafeInteger(input[key])||input[key]<0)throw new Error(`Nonnegative integer ${key} required`);
  const levelTerm=input.upgradeLevel*0.5,talentTerm=input.talentBonusLevels*0.5;
  const growthFraction=(levelTerm+talentTerm)/10,multiplier=1+growthFraction;
  const raw=input.base*multiplier+input.extra,value=Math.ceil(raw);
  if(!Number.isSafeInteger(value))throw new Error('Primary stat outside supported numeric range');
  return {status:'EXPERIMENTAL',build:input.build,value,finalDamage:null,
    trace:{base:input.base,extra:input.extra,levelTerm,talentTerm,growthFraction,multiplier,raw,rounding:'ceil without epsilon',value},
    unresolvedDependencies:['Character, quality-offset and talent lookup must be resolved separately','Soulforge and final battle property assembly','Independent gameplay validation']};
}
