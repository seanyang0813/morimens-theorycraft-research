// Numeric portion of the original BeHit payload. Actor/command identity is separate.
export function hitTriggerValues({incomingDamage,hpBefore,hpAfter,immune,preventEligible,hit}){
  for(const value of [incomingDamage,hpBefore,hpAfter])if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new Error('Explicit nonnegative damage and HP snapshots required');
  if(hpAfter>hpBefore||typeof immune!=='boolean'||typeof preventEligible!=='boolean'||!hit||!Array.isArray(hit.shield)||hit.shield.length!==6)throw new Error('Invalid resolved hit transition');
  const realDamage=hpBefore-hpAfter;
  return {changeVal:hit.hpLossRequest,curHp:hpAfter,oldHp:hpBefore,immueDamage:immune,
    originVal:incomingDamage,castDamage:incomingDamage,realDamage,unBlockedDamage:realDamage,
    blockedDamage:hit.shield[1],blockLose:hit.shield[2],isBlockedDamage:hit.shield[3],isBlockedAllDamage:hit.shield[4],
    overflowDamage:hpAfter<=0?incomingDamage-hit.shield[1]-hpBefore:null,
    pvp_death_resist:hit.deathResistApplied,isPreventActiveDamage:preventEligible,convertDamageVal:hit.converted};
}
