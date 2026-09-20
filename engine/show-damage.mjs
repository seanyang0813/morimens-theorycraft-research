// PC downloaded resources 144, build 51. Internal resolved values, not tooltips.
export const basePercentKeys = ['awakerOutsideDamagePer','awakerInsideBasicDamagePer','playerOutsideDamagePer','cardOutsideDmgPer','curCardDamagePer','basicDamagePer'];
export const flatKeys = ['cardDamagePlus','strength','ultiDamgePlus','strikecard_damage_plus','skillArgsPlus','awakerDamagePlus'];
export const independentPercentKeys = ['awakerInsideDamagePer', ...Array.from({length:8},(_,i)=>`awakerInsideDamagePer${i+1}`),'playerInsideDamagePer','dimension_fix_per','cardInsideDmgPer','cardDamagePer2'];
export const reductionKeys = ['spellboundDmgPer','spellboundDmgPer2','spellboundDmgPer3','spellboundDmgPer4','spellboundDmgPer5'];
export const inputKeys = ['value',...basePercentKeys,...flatKeys,'skillTypeOutsideDmgPer','skillTypeDmgPer','roleEnhancePer','roleWeakPer',...independentPercentKeys,'cardDamagePer3','card_damage_per3_n2','awaker_CmdCard_dmg_per','awaker_ulti_dmg_per','skillTypeInsideDmgPer',...reductionKeys];

// This constructor is only for explicitly neutral synthetic scenarios.
export function neutralShowInputs(value) {
  const data = Object.fromEntries(inputKeys.map(key=>[key,0]));
  return {...data,value,skillTypeOutsideDmgPer:1,skillTypeDmgPer:1,skillTypeInsideDmgPer:1};
}

export function showDamage(data) {
  const missing = inputKeys.filter(key=>!Number.isFinite(data?.[key]));
  const unknown = Object.keys(data ?? {}).filter(key=>!inputKeys.includes(key));
  if(missing.length || unknown.length) throw new Error(`Missing/non-finite: ${missing.join(',')}; unrecognized: ${unknown.join(',')}`);
  const trace=[];
  let base=data.value;
  for(const key of basePercentKeys) base *= 100+data[key];
  base *= data.skillTypeOutsideDmgPer;
  base *= data.skillTypeDmgPer;
  base /= 1e12;
  const flat=flatKeys.reduce((sum,key)=>sum+data[key],0);
  trace.push({stage:'base',value:base},{stage:'flat contributions',value:flat});
  let scaled=(base+flat)*(100+data.roleEnhancePer)/100*(1-data.roleWeakPer/100)*10000;
  for(const key of independentPercentKeys) scaled *= 1+data[key]/100;
  scaled *= 1+data.cardDamagePer3/100+data.card_damage_per3_n2/100;
  scaled *= 1+data.awaker_CmdCard_dmg_per/100;
  scaled *= 1+data.awaker_ulti_dmg_per/100;
  scaled *= data.skillTypeInsideDmgPer;
  scaled /= 10000;
  const ceiling=Math.max(Math.ceil(scaled-1e-5),1);
  let reductions=1;
  for(const key of reductionKeys) reductions *= 1-data[key]/100;
  const result=Math.max(Math.floor(ceiling*10000*reductions/10000+1e-5),1);
  trace.push({stage:'offensive subtotal',value:scaled},{stage:'ceil(x - 0.00001), minimum 1',value:ceiling},{stage:'reduction product',value:reductions},{stage:'floor(x + 0.00001), minimum 1',value:result});
  let diagnostic=data.value*10000*(1+data.awakerOutsideDamagePer/100)*(1+data.awakerInsideBasicDamagePer/100)*(1+data.playerOutsideDamagePer/100)*data.skillTypeOutsideDmgPer*(1+data.cardOutsideDmgPer/100)*(1+data.curCardDamagePer/100)*(1+data.basicDamagePer/100)*data.skillTypeDmgPer/10000;
  diagnostic=Math.max(Math.ceil(diagnostic-1e-5),1);
  if(![base,flat,scaled,result,diagnostic].every(Number.isFinite)) throw new Error('Numerical overflow');
  return {showDamage:result,diagnosticBaseDamage:diagnostic,trace,evidence:['PC144:BattleUtilServer.ShowDamageFormula'],status:'SUPPORTED_BY_RUNTIME_TEST'};
}
