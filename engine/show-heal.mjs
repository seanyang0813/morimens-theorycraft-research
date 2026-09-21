// PC downloaded resources 144 / build 51 BattleUtilServer.ShowHealFormula.
export const healBasePercentKeys=['awakerOutsideHealPer','playerOutsideHealPer','curCardHealPer','cardOutsideHealPer'];
export const healFlatKeys=['awakerHealPlus','cardHealPlus','skillArgsPlus'];
export const healInsidePercentKeys=['awakerInsideHealPer','dimension_fix_per','playerInsideHealPer','cardInsideHealPer','allDealHealPer'];
export const healReductionKeys=['spellboundHealPer','spellboundHealPer2','spellboundHealPer3','spellboundHealPer4','spellboundHealPer5'];
export const healInputKeys=['value',...healBasePercentKeys,'skillTypeHealPer',...healFlatKeys,'dying_per','dying_per2',...healInsidePercentKeys,'cardHealPer2','card_heal_per2_n2','awaker_CmdCard_heal_per','awaker_ulti_heal_per','skillTypeInsideHealPer',...healReductionKeys,'keeperskill_def_per','is_chaos_type2'];

export function neutralHealInputs(value){
  const data=Object.fromEntries(healInputKeys.map(key=>[key,0]));
  return {...data,value,skillTypeHealPer:1,skillTypeInsideHealPer:1};
}

export function showHeal(data){
  const missing=healInputKeys.filter(key=>!Number.isFinite(data?.[key]));
  const unknown=Object.keys(data??{}).filter(key=>!healInputKeys.includes(key));
  if(missing.length||unknown.length)throw new Error(`Missing/non-finite: ${missing.join(',')}; unrecognized: ${unknown.join(',')}`);
  let base=data.value;
  for(const key of healBasePercentKeys)base*=100+data[key];
  base*=data.skillTypeHealPer;
  base/=1e8;
  const flat=healFlatKeys.reduce((sum,key)=>sum+data[key],0);
  let scaled=(base+flat)*(100-data.dying_per)*(100-data.dying_per2);
  for(const key of healInsidePercentKeys)scaled*=100+data[key];
  scaled*=1+data.cardHealPer2/100+data.card_heal_per2_n2/100;
  scaled*=1+data.awaker_CmdCard_heal_per/100;
  scaled*=1+data.awaker_ulti_heal_per/100;
  scaled*=data.skillTypeInsideHealPer;
  scaled/=1e14;
  const ceiling=Math.max(Math.ceil(scaled-1e-5),1);
  let reductions=1;
  for(const key of healReductionKeys)reductions*=1-data[key]/100;
  const chaosMultiplier=!data.is_chaos_type2||data.keeperskill_def_per===0?1:1+data.keeperskill_def_per/100*data.is_chaos_type2;
  const showHeal=Math.max(Math.floor(ceiling*10000*reductions*chaosMultiplier/10000+1e-5),1);
  if(![base,flat,scaled,ceiling,reductions,chaosMultiplier,showHeal].every(Number.isFinite))throw new Error('Numerical overflow');
  return {showHeal,baseHeal:data.value,status:'SUPPORTED_BY_RUNTIME_TEST',evidence:['PC144:ShowHealFormula'],trace:[
    {stage:'base multiplicative bucket',value:base},{stage:'flat contributions',value:flat},{stage:'inside subtotal',value:scaled},
    {stage:'ceil(x - 0.00001), minimum 1',value:ceiling},{stage:'spellbound reduction product',value:reductions},
    {stage:'Chaos defense multiplier',value:chaosMultiplier},{stage:'floor(x + 0.00001), minimum 1',value:showHeal}
  ]};
}
