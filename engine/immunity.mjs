// Original PC 144 ImmueDamage predicate; values are resolved target properties.
export function resolveImmunity(input) {
  const categories=['Active','Passive','Fixed','Pure','Tentacle'];
  const keys=['build','category','puncture','general','punctureImmunity','categoryImmunities'];
  if(!input||keys.some(k=>!Object.hasOwn(input,k))||Object.keys(input).some(k=>!keys.includes(k)))throw new Error('Explicit immunity properties required');
  if(!['pc-res144-build51','pc-res150-build51','pc-res151-build51'].includes(input.build)||!categories.includes(input.category))throw new Error('Unsupported immunity build or category');
  const slots=input.categoryImmunities;
  if(typeof input.puncture!=='boolean'||!Number.isFinite(input.general)||!Number.isFinite(input.punctureImmunity)||!slots||categories.some(k=>!Number.isFinite(slots[k]))||Object.keys(slots).some(k=>!categories.includes(k)))throw new Error('Invalid immunity properties');
  const punctureBlocked=input.puncture&&input.punctureImmunity>0;
  const categoryBlocked=!input.puncture&&(input.general>0||slots[input.category]>0);
  return {immune:punctureBlocked||categoryBlocked,
    reason:punctureBlocked?'Puncture immunity':categoryBlocked?'General or matching category immunity':'No applicable immunity',
    evidence:[input.build==='pc-res151-build51'?'PC151:BattleUnitBase.BeHitHp.ExactDependencyCarryforward':input.build==='pc-res150-build51'?'PC150:BattleUnitBase.BeHitHp':'PC144:DamageImmunity'],status:'UNVERIFIED',finalDamage:null};
}
