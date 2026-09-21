// Intermediate BeHit helper diagnostics; does not mutate HP or run callbacks.
export function resolveHitLimits(v){
 const numeric=['damage','block','hp','retainHp','limit','usedLimit','deathResist'],flags=['puncture','preventEligible'];
 if(!v||numeric.some(k=>!Number.isFinite(v[k])||v[k]<0)||v.hp<=0||flags.some(k=>typeof v[k]!=='boolean')||Object.keys(v).some(k=>![...numeric,...flags,'build'].includes(k))||(v.build!==undefined&&!['pc-res144-build51','pc-res150-build51'].includes(v.build)))throw new Error('Explicit nonnegative inputs and a living target are required');
 let damage=v.damage,after=v.block,blocked=0,loss=0,hasBlock=false,allBlock=false;
 if(v.block>0&&damage>0){
  hasBlock=true;
  if(v.block<=damage){if(!v.puncture){damage-=v.block;blocked=v.block;}after=0;}
  else if(!v.puncture){blocked=damage-v.block;after=v.block-damage;damage=0;}
  else after=v.block-damage;
  allBlock=damage<=0;loss=v.block-after;
 }
 damage=Math.ceil(damage);
 const shield=[damage,blocked,loss,hasBlock,allBlock,after];
 let converted=0;
 if(v.preventEligible&&v.retainHp>0){const retained=Math.min(damage,Math.max(0,v.hp-v.retainHp));converted=damage-retained;damage=retained;}
 const afterRetain=damage;
 if(v.limit>0)damage=Math.min(damage,Math.max(0,v.limit-v.usedLimit));
 const deathResistApplied=v.deathResist>0&&v.hp<=damage;
 if(deathResistApplied)damage=v.hp-1;
 return {status:'UNVERIFIED',finalDamage:null,shield,afterRetain,converted,hpLossRequest:damage,deathResistApplied,evidence:[v.build==='pc-res150-build51'?'PC150:BattleUnitBase.BeHitHp':'PC144:HitLimitHelpers'],unresolvedDependencies:['Immunity and prevent eligibility','HP property mutation and callbacks','Events, statistics and death execution','Gameplay validation']};
}
