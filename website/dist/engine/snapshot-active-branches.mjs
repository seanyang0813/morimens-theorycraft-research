import {calculateSnapshotActiveDamage} from './battle-property-snapshot-damage.mjs';

// Enumerate the two possible critical outcomes for one fully specified hit.
// This does not predict an unknown RNG draw or later event/callback effects.
export function calculateSnapshotActiveBranches(value){
  if(!value||value.targetContext?.critRoll!==null)throw new Error('Branch calculation requires targetContext.critRoll: null');
  const withRoll=roll=>calculateSnapshotActiveDamage({...value,targetContext:{...value.targetContext,critRoll:roll}});
  const critical=withRoll(1),ordinary=withRoll(100);
  const crit=critical.critResolution,normal=ordinary.critResolution;
  if(crit.isCrit===false&&normal.isCrit===true)throw new Error('Critical resolution is not monotone across the two boundary rolls');
  const probability=crit.isCrit===normal.isCrit?(crit.isCrit?1:0):Math.max(0,Math.min(100,crit.critChanceCeil))/100;
  const branch=result=>({isCrit:result.critResolution.isCrit,preHitDamage:result.preHitDamage,modeledHpLost:result.modeledHpLost,calculation:result});
  return {schemaVersion:1,kind:'morimens-snapshot-active-damage-branches',status:'EXPERIMENTAL',build:value.build,critChanceCeil:crit.critChanceCeil,critProbability:probability,
    branches:{ordinary:branch(ordinary),critical:branch(critical)},
    expectedPreHitDamage:ordinary.preHitDamage*(1-probability)+critical.preHitDamage*probability,
    expectedModeledHpLost:ordinary.modeledHpLost===null?null:ordinary.modeledHpLost*(1-probability)+critical.modeledHpLost*probability,
    finalDamage:null,
    limitations:['Expected values describe one isolated hit under the recovered 1–100 critical draw rule; they do not predict its actual draw','Target, properties, card and state at the hit boundary are supplied inputs','Repeated-hit RNG, intervening effects, callbacks and target selection are not modeled by this branch operation']};
}
