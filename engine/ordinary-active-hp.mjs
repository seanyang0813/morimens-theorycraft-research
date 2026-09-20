import {resolveHitLimits} from './hit-limits.mjs';
import {subtractOrdinaryHp} from './hp-property.mjs';

// Explicit ordinary Active subset: generic immunity, no puncture-specific immunity.
// Callback descriptions do not execute combat listeners or death processing.
export function resolveOrdinaryActiveHp(input){
  const keys=['damage','block','puncture','hp','retainHp','limit','usedLimit','deathResist','genericImmunity','preventActiveDamage'];
  if(!input||Object.keys(input).some(key=>!keys.includes(key)))throw new Error('Unknown ordinary Active input');
  const {genericImmunity,preventActiveDamage,...values}=input??{};
  if(typeof genericImmunity!=='boolean'||typeof preventActiveDamage!=='boolean')throw new Error('Explicit immunity and prevention flags required');
  if(!Number.isFinite(values.damage)||values.damage<0)throw new Error('Explicit nonnegative damage required');
  const immune=genericImmunity&&!values.puncture;
  const preventEligible=preventActiveDamage&&!immune;
  const limits=resolveHitLimits({...values,damage:immune?0:values.damage,preventEligible});
  const hp=subtractOrdinaryHp({hp:values.hp,request:limits.hpLossRequest});
  const [_,blocked,blockLoss,hasBlock,allBlock,blockAfter]=limits.shield;
  const callbacks=[];
  if(blockAfter!==values.block)callbacks.push(
    {kind:'owner',property:'block',old:values.block,new:blockAfter},
    {kind:'send',property:'block',delta:-blockLoss,new:blockAfter});
  callbacks.push(...hp.callbacks);
  const record={changeVal:limits.hpLossRequest,curHp:hp.hpAfter,oldHp:values.hp,immueDamage:immune,realDamage:hp.hpLost,castDamage:values.damage,blockedDamage:blocked,blockLose:blockLoss,overflowDamage:hp.hpAfter<=0?values.damage-blocked-values.hp:null,isBlockedDamage:hasBlock,isBlockedAllDamage:allBlock,pvp_death_resist:limits.deathResistApplied,isPreventActiveDamage:preventEligible,convertDamageVal:limits.converted,blockAfter,callbacks};
  return {status:'EXPERIMENTAL',finalDamage:null,record,limits,evidence:['PC144:OrdinaryBeHitHp'],limitations:['Explicit ordinary Active input state; generic immunity only, no puncture-specific immunity','Records HP mutation and callbacks; does not execute event listeners, statistics, animation or death processing','No independent gameplay validation']};
}
