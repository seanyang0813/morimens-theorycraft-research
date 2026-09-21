// Translation of BattleCmdServer.__GetFinalDamage, FormulaSubType.All only.
// Values are explicitly resolved after eligibility checks. Output precedes BeHit.
export const targetPercentKeys=['beDamagePer','beDamagePer2','beDamagePer3','beDamagePer4','beDamagePer5','vulnerablePer','enemyTypeDmgPer','enemyBuffDmgPer','enemyDebuffDmgPer','enemyBlockDmgPer','enemyBlockBarrierDmgPer','cardBlockBarrierPer'];
export const targetKeys=['isCrit','awakerCritDamage','cardCritDamage','skillTypeCritDamage','awakerCardCritDamage','critDamagePer',...targetPercentKeys,'enemyStateDmgMultiplier','beDamagePlus'];

export function activeTargetDamage(showDamage,data,build='pc-res144-build51',{cardPresent=false}={}){
  if(!['pc-res144-build51','pc-res150-build51'].includes(build))throw new Error('Unsupported target-damage build');
  if(typeof cardPresent!=='boolean')throw new Error('Explicit target-damage card presence required');
  if(!Number.isFinite(showDamage)||showDamage<1)throw new Error('showDamage must be finite and at least 1');
  const missing=targetKeys.filter(k=>k==='isCrit'?typeof data?.[k]!=='boolean':!Number.isFinite(data?.[k]));
  const unknown=Object.keys(data??{}).filter(k=>!targetKeys.includes(k));
  if(missing.length||unknown.length)throw new Error(`Missing/non-finite target inputs: ${missing}; unrecognized: ${unknown}`);
  const critSum=data.isCrit?data.awakerCritDamage+data.cardCritDamage+data.skillTypeCritDamage+data.awakerCardCritDamage:0;
  const scaledCrit=critSum*(1+data.critDamagePer/100);
  let result=showDamage*(1+scaledCrit/100);
  const trace=[{stage:'crit bonus',value:scaledCrit},{stage:'after crit',value:result}];
  // The original groups the first five factors into targetBeDmgPer before
  // multiplying the other factors. Preserve that evaluation order.
  let targetProduct=1;
  for(const k of targetPercentKeys.slice(0,5))targetProduct*=1+data[k]/100;
  result*=targetProduct;
  for(const k of targetPercentKeys.slice(5))result*=1+data[k]/100;
  result*=data.enemyStateDmgMultiplier;
  result+=data.beDamagePlus;
  trace.push({stage:'target products and flat addition',value:result});
  const preHitDamage=Math.max(Math.ceil(result),1);
  if(!Number.isFinite(preHitDamage))throw new Error('Numerical overflow');
  trace.push({stage:'ceil, minimum 1',value:preHitDamage});
  const evidence=build==='pc-res150-build51'?(cardPresent?'PC150:BattleCmdServer.CardTargetCrit':'PC150:BattleCmdServer.FinalTargetDamage'):'PC144:BattleCmdServer.__GetFinalDamage';
  return {preHitDamage,trace,critBonusPercent:scaledCrit,evidence:[evidence],status:build==='pc-res150-build51'?'SUPPORTED_BY_CROSS_BUILD_RUNTIME_TEST':'CONFIRMED_FROM_CODE'};
}
