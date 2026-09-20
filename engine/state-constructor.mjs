// Numeric/absent state parameters only. Parser, trigger registration, logs and
// later AfterInit property work remain explicit hooks in the enclosing lifecycle.
export function constructNumericState({uid,stateId,caster,layer,maximum,recover,restoredData,skillLevel,parameter,hooks}){
  if(![uid,stateId,caster].every(Number.isSafeInteger)||!(layer===null||Number.isFinite(layer))||!(maximum===null||Number.isFinite(maximum))||typeof recover!=='boolean'||!(skillLevel===null||Number.isFinite(skillLevel))||!(parameter===null||Number.isFinite(parameter)))throw new Error('Explicit numeric state construction required');
  if(!hooks||['initializeParser','initializeTriggers','logLayers'].some(k=>typeof hooks[k]!=='function'))throw new Error('Explicit constructor hooks required');
  if(restoredData!==null&&(!restoredData||!Number.isFinite(restoredData.layer)||!Number.isFinite(restoredData.changedLayer)||!restoredData.casterLayers||Object.entries(restoredData.casterLayers).some(([k,v])=>!/^\d+$/.test(k)||!Number.isFinite(v))))throw new Error('Explicit restored layer data required');
  const requested=layer??1;
  const state={uid,stateId,caster,isDeleted:false,layer:restoredData?.layer??requested,changedLayer:restoredData?.changedLayer??requested,
    casterLayers:restoredData?{...restoredData.casterLayers}:{[caster]:requested},skillLevel:skillLevel??1,parameters:[],properties:{},specialProperties:{}};
  const trace=['uid','parser'];hooks.initializeParser(state);
  if(maximum!==null&&!recover){trace.push('maximum');state.layer=Math.min(Math.ceil(maximum),state.layer);}
  if(parameter!==null)state.parameters=[parameter];
  trace.push('triggers');hooks.initializeTriggers(state);
  trace.push('log');hooks.logLayers(0,state.layer,state);
  return {state,trace};
}
