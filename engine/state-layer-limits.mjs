export function limitStateLayers({stateId,layer,mode,rules,getCurrentLayer}){
  if(!Number.isSafeInteger(stateId)||!Number.isFinite(layer)||!['statistics','total'].includes(mode)||!Array.isArray(rules)||typeof getCurrentLayer!=='function')throw new Error('Explicit layer-limit context required');
  for(const r of rules)if(!r||!Array.isArray(r.stateIds)||r.stateIds.some(id=>!Number.isSafeInteger(id))||!Number.isFinite(r.limit)||(mode==='statistics'&&!Number.isFinite(r.used)))throw new Error('Explicit finite limit mappings required');
  const trace=[];
  for(const rule of rules)for(const id of rule.stateIds)if(id===stateId){
    trace.push('limit');
    let used;
    if(mode==='statistics'){trace.push('used');used=rule.used;}
    if(rule.limit>0){
      if(mode==='total'){trace.push('currentState');used=getCurrentLayer(stateId);if(!Number.isFinite(used))throw new Error('Finite current live layer required');}
      return {layer:Math.ceil(Math.min(layer,Math.max(rule.limit-used,0)))||0,trace};
    }
  }
  return {layer:Math.ceil(layer)||0,trace};
}
