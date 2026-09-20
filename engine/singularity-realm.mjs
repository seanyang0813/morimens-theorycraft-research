import {showDamage} from './show-damage.mjs';
import {activeTargetDamage} from './active-target.mjs';

// BattlePropertyServer.AfterAdd/AfterSub: caller supplies resolved player fields.
// Pure Ultra State72023 -> Cmd71973 -> State71974 contributes 100 to percent.
// Do not infer party composition or add the Pure Ultra contribution again here.
export function resolveFinalRealmMastery({occupationMaster,finalMasteryPercent}){
  if(!Number.isFinite(occupationMaster)||occupationMaster<0||!Number.isFinite(finalMasteryPercent)||finalMasteryPercent<0)throw new Error('Explicit nonnegative player mastery and final mastery percent required');
  const finalRealmMastery=Math.ceil(occupationMaster*(100+finalMasteryPercent)/100);
  if(!Number.isSafeInteger(finalRealmMastery))throw new Error('Resolved mastery outside supported integer range');
  return {occupationMaster,finalMasteryPercent,finalRealmMastery,...singularityLayers(finalRealmMastery)};
}

export function singularityLayers(finalRealmMastery){
  if(!Number.isFinite(finalRealmMastery)||finalRealmMastery<0)throw new Error('Explicit final team Realm Mastery required');
  return {prism:Math.ceil(15*(1+finalRealmMastery*.0005)),beacon:Math.ceil(25*(1+finalRealmMastery*.0005))};
}

// Explicit card-state schedule: no automatic mastery, copies or Shuttle eligibility.
export function applySingularityToCombo(report,{finalRealmMastery,beaconLayersByPlayedCard}){
  const {prism,beacon}=singularityLayers(finalRealmMastery);
  if(!Array.isArray(beaconLayersByPlayedCard)||beaconLayersByPlayedCard.length!==report.rounds.length*2||Array.from({length:beaconLayersByPlayedCard.length},(_,i)=>!Number.isSafeInteger(beaconLayersByPlayedCard[i])||beaconLayersByPlayedCard[i]<0).some(Boolean))throw new Error('Explicit dense Beacon schedule for every played card required');
  function hit(original,beaconLayers){
    if(!original)return null;
    if(original.utilityInputs.card_damage_per3_n2!==0||original.utilityInputs.cardDamagePer3!==0)throw new Error('Input already contains Prism/Beacon; refusing double count');
    const inputs={...original.utilityInputs,card_damage_per3_n2:2*prism,cardDamagePer3:2*beaconLayers};
    const utility=showDamage(inputs),target=activeTargetDamage(utility.showDamage,original.target);
    return {...original,prismLayers:prism,beaconLayers,utilityInputs:inputs,showDamage:utility.showDamage,preHitDamage:target.preHitDamage,trace:[...utility.trace,...target.trace]};
  }
  const rounds=report.rounds.map((r,i)=>{
    const aHit=hit(r.aHit,beaconLayersByPlayedCard[2*i]),blast=hit(r.blast,beaconLayersByPlayedCard[2*i+1]),pursuit=hit(r.pursuit,0);
    const arachneTotal=aHit.preHitDamage,blastTotal=2*blast.preHitDamage,pursuitTotal=pursuit?3*pursuit.preHitDamage:0;
    return {...r,aHit,blast,pursuit,arachneTotal,blastTotal,pursuitTotal,total:arachneTotal+blastTotal+pursuitTotal};
  });
  return {status:'EXPERIMENTAL',finalDamage:null,finalRealmMastery,prismLayers:prism,shuttleBeaconLayers:beacon,beaconLayersByPlayedCard,rounds,conditionalPreHitTotal:rounds.reduce((n,r)=>n+r.total,0),limitations:['Explicit final mastery and played-card Beacon schedule; no automatic team or turn reconstruction','E2 hit counts retained; no Arachne pursuit or other new action enabled','Permanent Prism and Beacon add within their shared factor, not separate multipliers','No independent gameplay validation']};
}
