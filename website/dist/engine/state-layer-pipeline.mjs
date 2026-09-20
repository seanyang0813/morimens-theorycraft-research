import {applyCardStateMultipliers} from './card-state-multiplier.mjs';

export const stateLayerFamilies=Object.freeze(['StateLayerPer','UltiStateLayerPer','CmdCardStateLayerPer','StateLayerPerByCard','BeStateLayerPer','BeDirectCmdStateLayerPer','UltiFixedStateLayerPer','CmdCardFixedStateLayerPer','CardFixedStateLayerPer','DirectCmdStateLayerPer']);
const flags=['trigger','skipCaster','noDirect','ulti','casterPresent','awaker','currentCardPresent','currentCardInstruction','currentCardSkill','modifierCardPresent','modifierCardInstruction'];

// Explicit resolved property mappings and card contexts; does not derive properties.
export function calculateStateLayers({layer,stateId,context,modifiers,dimensionStateIds,applyDimension}){
  if(!(layer===null||Number.isFinite(layer))||!Number.isSafeInteger(stateId))throw new Error('Finite layer or null and integer state ID required');
  if(!context||flags.some(key=>typeof context[key]!=='boolean'))throw new Error('All state-layer context flags must be explicit');
  if(!modifiers||stateLayerFamilies.some(key=>!Array.isArray(modifiers[key])))throw new Error('Every property family must be explicit');
  if(Object.keys(modifiers).some(key=>!stateLayerFamilies.includes(key)))throw new Error('Unknown state-layer property family');
  if(!Array.isArray(dimensionStateIds)||dimensionStateIds.some(id=>!Number.isSafeInteger(id))||typeof applyDimension!=='function')throw new Error('Explicit dimension mapping and resolver required');
  for(const family of stateLayerFamilies)for(const m of modifiers[family]){
    if(!m||typeof m.property!=='string'||!Array.isArray(m.stateIds)||m.stateIds.some(id=>!Number.isSafeInteger(id))||!Number.isFinite(m.percent))throw new Error('Explicit finite property mapping required');
    if(family==='StateLayerPer'&&typeof m.commandPowerOnly!=='boolean')throw new Error('Explicit caster property eligibility required');
    if(['StateLayerPerByCard','CardFixedStateLayerPer'].includes(family)&&!(m.linked===null||(typeof m.linked?.property==='string'&&Number.isFinite(m.linked.percent))))throw new Error('Explicit linked character mapping required');
  }
  let value=Math.ceil(layer??1);
  const trace=[{stage:'initialCeiling',before:layer,after:value}],reads=[];
  const c=context;
  function percent(family,owner){
    for(const m of modifiers[family])for(const id of m.stateIds)if(id===stateId){
      reads.push({owner,property:m.property});
      const eligible=!(family==='StateLayerPer'&&m.commandPowerOnly)||(!c.trigger&&c.currentCardPresent&&c.currentCardSkill&&c.awaker);
      const before=value;
      if(eligible)value*=1+m.percent/100;
      trace.push({stage:family,property:m.property,eligible,before,percent:m.percent,after:value});
    }
  }
  function card(family){
    const result=applyCardStateMultipliers({layer:value,stateId,cardPresent:c.modifierCardPresent,casterPresent:c.casterPresent,instructionCard:c.modifierCardInstruction,
      modifiers:modifiers[family].map(m=>({stateIds:m.stateIds,cardPercent:m.percent,characterPercent:m.linked?.percent??null}))});
    for(const t of result.trace){
      const m=modifiers[family][t.index];reads.push({owner:'card',property:m.property});
      if(t.characterApplied)reads.push({owner:'caster',property:m.linked.property});
      trace.push({stage:family,...t});
    }
    value=result.layer;
  }
  function casterAndCard(ultiFamily,commandFamily,cardFamily){
    if(c.casterPresent&&c.ulti)percent(ultiFamily,'caster');
    if(c.casterPresent&&c.currentCardPresent&&c.currentCardInstruction)percent(commandFamily,'caster');
    card(cardFamily);
  }
  if(!c.skipCaster){
    if(c.casterPresent)percent('StateLayerPer','caster');
    if(!c.trigger)casterAndCard('UltiStateLayerPer','CmdCardStateLayerPer','StateLayerPerByCard');
  }
  percent('BeStateLayerPer','target');
  if(!c.noDirect)percent('BeDirectCmdStateLayerPer','target');
  if(!c.noDirect&&!c.trigger){
    casterAndCard('UltiFixedStateLayerPer','CmdCardFixedStateLayerPer','CardFixedStateLayerPer');
    if(c.casterPresent)percent('DirectCmdStateLayerPer','caster');
  }
  for(const id of dimensionStateIds)if(id===stateId){
    const before=value;value=applyDimension(value);reads.push({owner:'effect',property:'CalFinalVal'});
    if(!Number.isFinite(value))throw new Error('Dimension result must be finite');
    trace.push({stage:'dimension',before,after:value});
  }
  if(!Number.isFinite(value))throw new Error('State-layer overflow');
  const result=Math.ceil(value);
  if(!Number.isSafeInteger(result))throw new Error('State layers exceed exact integer range');
  trace.push({stage:'finalCeiling',before:value,after:result});
  return {layer:result,trace,reads};
}
