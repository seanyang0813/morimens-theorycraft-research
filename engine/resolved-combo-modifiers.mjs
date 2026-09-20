import {showDamage,basePercentKeys,independentPercentKeys} from './show-damage.mjs';
import {activeTargetDamage} from './active-target.mjs';

// Diagnostic overlay on an already resolved combo, not an equipment resolver.
const supported=new Set([...basePercentKeys.filter(k=>k!=='basicDamagePer'),...independentPercentKeys,'cardDamagePer3','card_damage_per3_n2','awaker_CmdCard_dmg_per','awaker_ulti_dmg_per']);
export function recalculateResolvedCombo(report,{teamDamageAmplificationPercent,wheelBonusesByOwner}){
  if(!Number.isFinite(teamDamageAmplificationPercent)||teamDamageAmplificationPercent<0)throw new Error('Explicit nonnegative team Damage Amplification required');
  if(!wheelBonusesByOwner||Object.keys(wheelBonusesByOwner).some(k=>!['Mouchette','Arachne'].includes(k)))throw new Error('Explicit owner-specific Wheel bonus lists required');
  for(const owner of ['Mouchette','Arachne']){
    const bonuses=wheelBonusesByOwner[owner];
    if(!Array.isArray(bonuses))throw new Error('Explicit Wheel bonus list required for '+owner);
    for(const bonus of bonuses)if(!bonus||!supported.has(bonus.utilityProperty)||!Number.isFinite(bonus.percent)||typeof bonus.evidence!=='string'||!bonus.evidence.trim())throw new Error('Wheel bonus needs a supported resolved property, finite percent and evidence reference');
  }
  const evaluate=hit=>{
    if(!hit)return null;
    const inputs={...hit.utilityInputs,basicDamagePer:teamDamageAmplificationPercent};
    for(const bonus of wheelBonusesByOwner[hit.owner])inputs[bonus.utilityProperty]+=bonus.percent;
    const utility=showDamage(inputs),target=activeTargetDamage(utility.showDamage,hit.target);
    return {owner:hit.owner,inputs,showDamage:utility.showDamage,preHitDamage:target.preHitDamage,trace:[...utility.trace,...target.trace]};
  };
  const rounds=report.rounds.map(row=>{
    const strike=evaluate(row.aHit),blast=evaluate(row.blast),pursuit=evaluate(row.pursuit);
    // Preserve the approved E2 scenario: two Blast hits, three pursuit hits.
    return {round:row.round,strike,blast,pursuit,total:strike.preHitDamage+2*blast.preHitDamage+(pursuit?3*pursuit.preHitDamage:0)};
  });
  return {status:'EXPERIMENTAL',finalDamage:null,conditionalPreHitTotal:rounds.reduce((n,r)=>n+r.total,0),rounds,inputs:{teamDamageAmplificationPercent,wheelBonusesByOwner},limitations:['Preserves approved E2 hit counts, existing ATK, flat Exalt bonus and target inputs','Wheel effects must already be resolved and eligible; source labels are caller provenance, not verification','Wheel primary stats, crit changes, tag-specific factors and effects changing during the combo require full input reconstruction','No independent gameplay or complete equipment validation']};
}
