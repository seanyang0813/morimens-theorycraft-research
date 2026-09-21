import {healInputKeys,showHeal} from './show-heal.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const modifierKeys=healInputKeys.filter(key=>key!=='value');

export function storeHeal(input){
  if(!exact(input,['request','hp','maxHp'])||![input.request,input.hp,input.maxHp].every(Number.isFinite)||input.maxHp<0)throw new Error('Explicit Heal storage inputs required');
  const roundedHp=Math.ceil(input.hp+input.request),overFlowHeal=Math.max(0,roundedHp-input.maxHp),calculatedHp=Math.min(roundedHp,input.maxHp),realHeal=calculatedHp-input.hp,hpAfter=Math.max(calculatedHp,0);
  if(![roundedHp,overFlowHeal,calculatedHp,hpAfter,realHeal].every(Number.isFinite))throw new Error('Nonfinite Heal storage result');
  return {roundedHp,calculatedHp,hpAfter,realHeal,overFlowHeal};
}

export function calculateHeal(input){
  if(!exact(input,['base','modifiers','target','storage'])||!Number.isFinite(input.base)||!exact(input.modifiers,modifierKeys)||!Object.values(input.modifiers).every(Number.isFinite)||
    !exact(input.target,['beHealPer','beHealPlus'])||!Object.values(input.target).every(Number.isFinite)||!exact(input.storage,['hp','maxHp']))throw new Error('Explicit resolved Heal calculation and storage inputs required');
  const formula=showHeal({value:input.base,...input.modifiers});
  const targetRaw=formula.showHeal*(1+input.target.beHealPer/100)+input.target.beHealPlus;
  const roundedRequest=Math.ceil(targetRaw),requestedHeal=Object.is(roundedRequest,-0)?0:roundedRequest;
  const storage=storeHeal({request:requestedHeal,...input.storage});
  return {status:'EXPERIMENTAL',finalDamage:null,formula,targetRaw,requestedHeal,...storage,
    trace:[...formula.trace,{stage:'recipient Heal modifiers before ceil',value:targetRaw},{stage:'requested Heal',value:requestedHeal},{stage:'HP after ceil and maximum',value:storage.hpAfter},{stage:'overflow Heal',value:storage.overFlowHeal}],
    evidence:['PC144:ShowHealFormula','PC144:FinalHeal','PC144:HealStorage'],
    unresolvedDependencies:['Automatic command, caster/card/tag and property assembly','Effect repetition, target life eligibility, property-change listeners and Heal events','Independent gameplay validation']};
}
