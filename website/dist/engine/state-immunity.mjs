export function resolveStateImmunity({stateId,buffType,properties,specificRules}){
  const keys=['immue_buff','immue_debuff','immue_both_buff'];
  if(!Number.isSafeInteger(stateId)||!['none','buff','debuff'].includes(buffType)||!properties||keys.some(k=>!Number.isFinite(properties[k]))||!Array.isArray(specificRules))throw new Error('Explicit state type and numeric immunity properties required');
  for(const r of specificRules)if(!r||typeof r.property!=='string'||!Array.isArray(r.stateIds)||r.stateIds.some(n=>!Number.isSafeInteger(n))||!Number.isFinite(r.value))throw new Error('Explicit state-specific immunity mappings required');
  const reads=[...keys],tipStateIds=[];
  if((properties.immue_both_buff>0&&buffType!=='none')||(properties.immue_buff>0&&buffType==='buff')||(properties.immue_debuff>0&&buffType==='debuff'))return {immune:true,reads,tipStateIds:[null]};
  for(const rule of specificRules)for(const id of rule.stateIds){
    reads.push(rule.property);
    if(stateId===id&&rule.value>0)return {immune:true,reads,tipStateIds:[stateId]};
  }
  return {immune:false,reads,tipStateIds};
}
