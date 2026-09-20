// Non-keeper PvE CanUseCard boundary only. Turn gates and target rules are external.
export function checkPveCardPlay(v){
  const bools=['cardExists','inHand','judgeCost','commandExists','dead','strike','variable','energyEnough','allowIgnoreCost'];
  const nums=['cardUseless','ownerUseless','coma','comaImmunity','ownerForbid','playerForbid','ownerForbidStrike','playerForbidStrike'];
  if(!v||bools.some(k=>typeof v[k]!=='boolean')||nums.some(k=>!Number.isFinite(v[k]))||Object.keys(v).some(k=>![...bools,...nums].includes(k)))throw new Error('Explicit non-keeper PvE card-check inputs required');
  let gate='passed',reasonCode=null,allowed=false,resetAllowIgnoreCost=false;
  if(!v.cardExists||!v.inHand){gate='hand';reasonCode=1;}
  else if(!v.judgeCost||v.cardUseless>0||v.ownerUseless>0||!v.commandExists){gate='usable-card';reasonCode=2;}
  else if(v.dead){gate='alive';reasonCode=6;}
  else if(v.coma>0&&v.comaImmunity===0){gate='coma';}
  else if(v.ownerForbid>0||v.playerForbid>0||(v.strike&&(v.ownerForbidStrike>0||v.playerForbidStrike>0))){gate='prohibition';reasonCode=2;}
  else if(!v.variable&&!v.energyEnough&&!v.allowIgnoreCost){gate='energy';reasonCode=5;}
  else{allowed=true;resetAllowIgnoreCost=!v.variable&&v.energyEnough;}
  return {status:'EXPERIMENTAL',allowed,reasonCode,gate,resetAllowIgnoreCost,scope:'Non-keeper PvE CanUseCard only',unresolvedDependencies:['Properties and EnergyEnough supplied','Turn/actor gates, keeper cards, PvP targets and forced plays excluded','Independent gameplay validation']};
}
