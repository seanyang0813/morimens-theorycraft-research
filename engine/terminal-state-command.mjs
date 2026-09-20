import {snapshot} from './experiments.mjs';
import {importCommandRows} from './import-command-rows.mjs';
import {compileNumericCommand} from './command-expressions.mjs';
import {runDamageEnergyCommand} from './damage-energy-command.mjs';
import {runStateSequenceExperiment} from './state-sequence-experiment.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));

// Complete only for a damage/energy prefix followed by a contiguous suffix of
// unconditional caster- or target-owned state rows. Later rows cannot observe it.
export function runTerminalStateCommand(value){
  const input=snapshot(value);
  if(!exact(input,['schemaVersion','kind','build','otherEvents','command','variables','targetBinding','attackBase','energy','state'])||input.schemaVersion!==1||input.kind!=='morimens-terminal-state-command'||input.build!=='pc-res144-build51'||input.otherEvents!=='assumed-absent')throw new Error('Explicit terminal-state command required');
  const imported=importCommandRows(input.command),firstStateIndex=imported.rows.findIndex(row=>row.Type==='BEAddState'),prefix=imported.rows.slice(0,firstStateIndex),suffix=firstStateIndex<0?[]:imported.rows.slice(firstStateIndex);
  if(prefix.length===0||suffix.length===0||suffix.some(row=>row?.Type!=='BEAddState'||Object.hasOwn(row,'Cond')||Object.keys(row).some(key=>!['id','Type','Target','Para'].includes(key))))throw new Error('One or more unconditional terminal state rows required');
  if(prefix.some(row=>!['BEActiveDamage','BEGainUltiEnergy'].includes(row.Type)))throw new Error('Prefix supports only active damage and ultimate-energy gain');
  if(!exact(input.targetBinding,['expression','resolution'])||input.targetBinding.resolution!=='supplied-single-UpperTarget')throw new Error('Explicit single-target binding required');
  const stateOwners=suffix.map(row=>row.Target==='CmdCaster'?'actor':row.Target===input.targetBinding.expression?'target':null);
  if(stateOwners.includes(null))throw new Error('Terminal states must target the caster or the supplied damage target');
  const normalizedPrefix=prefix.map(row=>{
    if(row.Type==='BEActiveDamage'){
      if(row.Target!==input.targetBinding.expression)throw new Error('Damage-row selector does not match supplied target binding');
      return {...row,Target:'UpperTarget'};
    }
    if(row.Target!=='CmdCaster')throw new Error('Energy gain must target command caster');
    return row;
  });
  const evaluations=suffix.map(row=>compileNumericCommand(row.Para)(name=>input.variables?.[name]));
  if(evaluations.some(evaluation=>evaluation.values.length!==2||!Number.isSafeInteger(evaluation.values[0])||!Number.isFinite(evaluation.values[1])))throw new Error('Each terminal BEAddState requires numeric state ID and layer');
  const state=input.state;
  const single=exact(state,['definition','request','actorProperties','targetProperties','stateQueries']);
  const plural=exact(state,['definitions','requests','actorProperties','targetProperties','stateQueries']);
  if(!single&&!plural)throw new Error('Explicit terminal state definition/request context required');
  const definitions=single?[state.definition]:state.definitions,requests=single?[state.request]:state.requests;
  if(!Array.isArray(definitions)||!Array.isArray(requests)||requests.length!==suffix.length)throw new Error('One explicit request per terminal state row required');
  const definitionById=new Map();
  for(const definition of definitions){if(!definition||definitionById.has(definition.id))throw new Error('Unique terminal state definitions required');definitionById.set(definition.id,definition);}
  const applications=evaluations.map((evaluation,index)=>{const [stateId,layer]=evaluation.values,definition=definitionById.get(stateId),request=requests[index];if(!definition||definition.owner!==stateOwners[index]||request?.layer!==layer)throw new Error('Terminal row, definition owner/ID and explicit request layer must agree');return {stateId,layer,definition,request};});
  const prefixCommand={...input.command,data_list:Object.fromEntries(normalizedPrefix.map((row,index)=>{
    const {id,...exported}=row;return [String(index+1),exported];
  }))};
  const prefixResult=runDamageEnergyCommand({schemaVersion:1,kind:'morimens-damage-energy-command',build:input.build,otherEvents:'assumed-absent',command:prefixCommand,variables:input.variables,attackBase:input.attackBase,energy:input.energy});
  const terminalRows=suffix.map((row,index)=>({...row,evaluation:evaluations[index]}));
  const base={schemaVersion:1,build:input.build,finalDamage:null,prefix:prefixResult,stateApplication:null,terminalRow:terminalRows.length===1?terminalRows[0]:null,terminalRows};
  if(prefixResult.status!=='EXPERIMENTAL'||!prefixResult.completed)return {...base,status:prefixResult.status,completed:false,stop:prefixResult.stop??'Prefix did not complete; terminal state was not applied'};
  const offense={...input.attackBase.offense},targetModifiers={...input.attackBase.targetModifiers};
  const same=(a,b)=>Object.is(a,b);
  if(!same(state.actorProperties.basic_damage_per,offense.basicDamagePer)||!same(state.actorProperties.crit_damage,targetModifiers.awakerCritDamage)||
    !same(state.targetProperties.be_damage_per,targetModifiers.beDamagePer)||!same(state.targetProperties.be_damage_per2,targetModifiers.beDamagePer2)||!same(state.targetProperties.be_damage_per3,targetModifiers.beDamagePer3)||!same(state.targetProperties.vulnerable_per,targetModifiers.vulnerablePer))throw new Error('State live properties must match the prefix combat snapshot');
  delete offense.basicDamagePer;
  for(const key of ['awakerCritDamage','beDamagePer','beDamagePer2','beDamagePer3','vulnerablePer'])delete targetModifiers[key];
  const stateApplication=runStateSequenceExperiment({schemaVersion:1,kind:'morimens-state-sequence',build:input.build,otherEvents:'assumed-absent',crossesTurnBoundary:false,
    actorProperties:state.actorProperties,targetProperties:state.targetProperties,stateQueries:state.stateQueries,definitions,
    steps:applications.map(({stateId,request})=>({type:'applyState',definitionId:stateId,request})),attackBase:{...input.attackBase,variables:input.variables,offense,targetModifiers,targetState:prefixResult.targetAfter}});
  return {...base,status:'EXPERIMENTAL',completed:stateApplication.completed,stop:stateApplication.stop,targetAfter:prefixResult.targetAfter,casterEnergyAfter:prefixResult.casterEnergyAfter,
    modeledHpLost:prefixResult.modeledHpLost,stateApplication,
    unresolvedDependencies:[...prefixResult.unresolvedDependencies,...stateApplication.unresolvedDependencies,'Only a contiguous unconditional terminal BEAddState suffix to the caster or supplied target; no later-row observation','Command target is explicitly bound to one supplied target; no automatic target acquisition','Composition is not a connected original complete command or independent gameplay validation']};
}
