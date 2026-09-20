export function resolveActivePrevention(input){
  const keys=['build','damageType','immune','casterExists','casterPrevention','targetPrevention'];
  if(!input||keys.some(k=>!Object.hasOwn(input,k))||Object.keys(input).some(k=>!keys.includes(k)))throw new Error('Explicit prevention properties required');
  if(input.build!=='pc-res144-build51'||!['ACTIVE','PASSIVE','FIXED','PURE','TENTACLE'].includes(input.damageType))throw new Error('Unsupported prevention build or category');
  if(typeof input.immune!=='boolean'||typeof input.casterExists!=='boolean'||!Number.isFinite(input.casterPrevention)||!Number.isFinite(input.targetPrevention))throw new Error('Invalid prevention properties');
  return {preventEligible:input.damageType==='ACTIVE'&&!input.immune&&input.casterExists&&(input.casterPrevention>0||input.targetPrevention>0),evidence:['PC144:ActivePreventionEligibility'],status:'UNVERIFIED',finalDamage:null};
}
