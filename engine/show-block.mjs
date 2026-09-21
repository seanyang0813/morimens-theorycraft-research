// PC downloaded resources 144 / build 51 BattleUtilServer.ShowBlockFormula.
// All values are resolved combat properties; this module does not infer a build.
export const blockBasePercentKeys=['awakerOutsideBlockPer','playerOutsideBlockPer','curCardBlockPer','cardBlockPer','ultiBlockPer'];
export const blockFlatKeys=['awakerBlockPlus','cardBlockPlus','skillArgsPlus'];
export const blockInsidePercentKeys=['awakerInsideBlockPer','playerInsideBlockPer','instructcardFinalBlockPer','dimension_fix_per'];
export const blockReductionKeys=['spellboundBlockPer','spellboundBlockPer2','spellboundBlockPer3','spellboundBlockPer4','spellboundBlockPer5'];
export const blockInputKeys=['value',...blockBasePercentKeys,'skillTypeBlockPer',...blockFlatKeys,'awakerFrailPer',...blockInsidePercentKeys,'skillTypeInsideBlockPer','cardBlockPer2','card_block_per2_n2','awaker_CmdCard_block_per','awaker_ulti_block_per',...blockReductionKeys,'keeperskill_def_per','is_chaos_type2'];

export function neutralBlockInputs(value){
  const data=Object.fromEntries(blockInputKeys.map(key=>[key,0]));
  return {...data,value,skillTypeBlockPer:1,skillTypeInsideBlockPer:1};
}

export function showBlock(data){
  const missing=blockInputKeys.filter(key=>!Number.isFinite(data?.[key]));
  const unknown=Object.keys(data??{}).filter(key=>!blockInputKeys.includes(key));
  if(missing.length||unknown.length)throw new Error(`Missing/non-finite: ${missing.join(',')}; unrecognized: ${unknown.join(',')}`);
  let base=data.value;
  for(const key of blockBasePercentKeys)base*=100+data[key];
  base*=data.skillTypeBlockPer;
  base/=1e10;
  const flat=blockFlatKeys.reduce((sum,key)=>sum+data[key],0);
  let scaled=(base+flat)*(1-data.awakerFrailPer/100);
  for(const key of blockInsidePercentKeys)scaled*=100+data[key];
  scaled*=data.skillTypeInsideBlockPer;
  scaled*=1+data.cardBlockPer2/100+data.card_block_per2_n2/100;
  scaled*=1+data.awaker_CmdCard_block_per/100;
  scaled*=1+data.awaker_ulti_block_per/100;
  scaled/=1e8;
  const ceiling=Math.max(Math.ceil(scaled-1e-5),1);
  let reductions=1;
  for(const key of blockReductionKeys)reductions*=1-data[key]/100;
  const chaosMultiplier=!data.is_chaos_type2||data.keeperskill_def_per===0?1:1+data.keeperskill_def_per/100*data.is_chaos_type2;
  const showBlock=Math.max(Math.floor(ceiling*10000*reductions*chaosMultiplier/10000+1e-5),1);
  const baseBlock=Math.max(Math.ceil(base-1e-5),1);
  if(![base,flat,scaled,ceiling,reductions,chaosMultiplier,showBlock,baseBlock].every(Number.isFinite))throw new Error('Numerical overflow');
  return {showBlock,baseBlock,status:'SUPPORTED_BY_RUNTIME_TEST',evidence:['PC144:ShowBlockFormula'],trace:[
    {stage:'base multiplicative bucket',value:base},
    {stage:'flat contributions',value:flat},
    {stage:'inside subtotal',value:scaled},
    {stage:'ceil(x - 0.00001), minimum 1',value:ceiling},
    {stage:'spellbound reduction product',value:reductions},
    {stage:'Chaos defense multiplier',value:chaosMultiplier},
    {stage:'floor(x + 0.00001), minimum 1',value:showBlock}
  ]};
}
