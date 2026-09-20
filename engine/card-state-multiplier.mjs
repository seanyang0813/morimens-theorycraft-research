// Shared arithmetic of ApplyCardStateLayerPer / ApplyCardFixedStateLayerPer.
// Callers must supply the correctly selected card and property-family mappings.
export function applyCardStateMultipliers({layer,stateId,cardPresent,casterPresent,instructionCard,modifiers}) {
  if(!Number.isFinite(layer)||!Number.isSafeInteger(stateId))throw new Error('Finite layer and integer state ID required');
  if([cardPresent,casterPresent,instructionCard].some(v=>typeof v!=='boolean')||!Array.isArray(modifiers))throw new Error('Explicit card context and modifiers required');
  for(const m of modifiers)if(!m||!Array.isArray(m.stateIds)||m.stateIds.some(id=>!Number.isSafeInteger(id))||!Number.isFinite(m.cardPercent)||!(m.characterPercent===null||Number.isFinite(m.characterPercent)))throw new Error('Explicit state mapping and finite percentages required');
  const trace=[];
  if(!cardPresent)return {layer,trace};
  for(const [index,m] of modifiers.entries())for(const id of m.stateIds)if(id===stateId){
    const characterApplied=casterPresent&&instructionCard&&m.characterPercent!==null;
    const characterPercent=characterApplied?m.characterPercent:0;
    const before=layer,multiplier=1+m.cardPercent/100+characterPercent/100;
    layer*=multiplier;
    if(!Number.isFinite(layer))throw new Error('State multiplier overflow');
    trace.push({index,before,cardPercent:m.cardPercent,characterApplied,characterPercent,multiplier,after:layer});
  }
  return {layer,trace};
}
