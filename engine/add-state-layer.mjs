const finite=v=>{if(!Number.isFinite(v))throw new Error('Finite layer value required');return v;};
const uid=v=>v===null||Number.isSafeInteger(v);

// Existing-state AddLayer only. Creation eligibility and callback execution belong
// to the caller. A capped merge still updates caster attribution and cached commands.
export function mergeStateLayers({state,add,caster,maximum,sourceType,resolvedCommandCaster,cachedTriggers}){
  if(!state||!uid(state.caster)||!uid(caster)||!uid(resolvedCommandCaster)||typeof state.hasCreateArgs!=='boolean'||!Array.isArray(state.sources)||!state.casterLayers||Array.isArray(state.casterLayers))throw new Error('Explicit state attribution required');
  finite(state.layer);finite(state.changedLayer);finite(maximum);if(add!==null)finite(add);
  if(!uid(sourceType)||state.sources.some(s=>!s||!uid(s.sourceType)||!Number.isFinite(s.layer)))throw new Error('Explicit numeric source types and layers required');
  if(Object.entries(state.casterLayers).some(([k,v])=>!/^\d+$/.test(k)||!Number.isSafeInteger(Number(k))||!Number.isFinite(v)))throw new Error('Explicit numeric caster attribution map required');
  if(!Array.isArray(cachedTriggers)||new Set(cachedTriggers).size!==cachedTriggers.length||cachedTriggers.some(i=>!Number.isInteger(i)||i<1||i>6))throw new Error('Unique cached trigger slots 1 through 6 required');
  const result={layer:state.layer,changedLayer:state.changedLayer,caster,creationCaster:state.hasCreateArgs?caster:null,
    casterLayers:{...state.casterLayers},sources:state.sources.map(s=>({...s})),trace:[{event:'resolveCaster'},
      ...[...cachedTriggers].sort((a,b)=>a-b).map(index=>({event:'updateTriggerCaster',index,caster:resolvedCommandCaster})),{event:'maximum'}]};
  const cap=Math.ceil(maximum);
  if(cap<=state.layer){
    if(caster!==null&&caster!==state.caster)result.trace.push({event:'args'},{event:'record'});
    return result;
  }
  result.layer=finite(Math.min(cap,state.layer+(add??1)));
  result.changedLayer=finite(result.layer-state.layer);
  if(caster!==null&&result.changedLayer>0)result.casterLayers[caster]=finite((result.casterLayers[caster]??0)+result.changedLayer);
  for(const source of result.sources)if(source.sourceType===sourceType)source.layer=finite(source.layer+result.changedLayer);
  result.trace.push({event:'propertyDelta',value:result.changedLayer},{event:'args'},{event:'record'},{event:'log'});
  if(result.layer<=0)result.trace.push({event:'lifeEnd'});
  return result;
}
