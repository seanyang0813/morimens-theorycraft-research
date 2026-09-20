import {snapshot} from './experiments.mjs';
import {importCommandRows} from './import-command-rows.mjs';
import {compileNumericCommand} from './command-expressions.mjs';
import {runDamageEnergyCommand} from './damage-energy-command.mjs';
import {runStateSequenceExperiment} from './state-sequence-experiment.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));

// Complete only for a damage/energy prefix followed by one unconditional self-state row.
// The state is terminal, so no claim is made about later rows observing it.
export function runTerminalStateCommand(value){
  const input=snapshot(value);
  if(!exact(input,['schemaVersion','kind','build','otherEvents','command','variables','targetBinding','attackBase','energy','state'])||input.schemaVersion!==1||input.kind!=='morimens-terminal-state-command'||input.build!=='pc-res144-build51'||input.otherEvents!=='assumed-absent')throw new Error('Explicit terminal-state command required');
  const imported=importCommandRows(input.command),last=imported.rows.at(-1),prefix=imported.rows.slice(0,-1);
  if(prefix.length===0||last?.Type!=='BEAddState'||Object.hasOwn(last,'Cond')||Object.keys(last).some(key=>!['id','Type','Target','Para'].includes(key)))throw new Error('One unconditional terminal state row required');
  if(prefix.some(row=>!['BEActiveDamage','BEGainUltiEnergy'].includes(row.Type)))throw new Error('Prefix supports only active damage and ultimate-energy gain');
  if(!exact(input.targetBinding,['expression','resolution'])||input.targetBinding.resolution!=='supplied-single-UpperTarget')throw new Error('Explicit single-target binding required');
  const stateOwner=last.Target==='CmdCaster'?'actor':last.Target===input.targetBinding.expression?'target':null;
  if(stateOwner===null)throw new Error('Terminal state must target the caster or the supplied damage target');
  const normalizedPrefix=prefix.map(row=>{
    if(row.Type==='BEActiveDamage'){
      if(row.Target!==input.targetBinding.expression)throw new Error('Damage-row selector does not match supplied target binding');
      return {...row,Target:'UpperTarget'};
    }
    if(row.Target!=='CmdCaster')throw new Error('Energy gain must target command caster');
    return row;
  });
  const evaluation=compileNumericCommand(last.Para)(name=>input.variables?.[name]);
  if(evaluation.values.length!==2||!Number.isSafeInteger(evaluation.values[0])||!Number.isFinite(evaluation.values[1]))throw new Error('Terminal BEAddState requires numeric state ID and layer');
  const [stateId,layer]=evaluation.values;
  const state=input.state;
  if(!exact(state,['definition','request','actorProperties','targetProperties','stateQueries'])||state.definition?.id!==stateId||state.definition.owner!==stateOwner||state.request?.layer!==layer)throw new Error('Terminal row, definition owner/ID and explicit request layer must agree');
  const prefixCommand={...input.command,data_list:Object.fromEntries(normalizedPrefix.map((row,index)=>{
    const {id,...exported}=row;return [String(index+1),exported];
  }))};
  const prefixResult=runDamageEnergyCommand({schemaVersion:1,kind:'morimens-damage-energy-command',build:input.build,otherEvents:'assumed-absent',command:prefixCommand,variables:input.variables,attackBase:input.attackBase,energy:input.energy});
  const base={schemaVersion:1,build:input.build,finalDamage:null,prefix:prefixResult,stateApplication:null,terminalRow:{...last,evaluation}};
  if(prefixResult.status!=='EXPERIMENTAL'||!prefixResult.completed)return {...base,status:prefixResult.status,completed:false,stop:prefixResult.stop??'Prefix did not complete; terminal state was not applied'};
  const offense={...input.attackBase.offense},targetModifiers={...input.attackBase.targetModifiers};
  const same=(a,b)=>Object.is(a,b);
  if(!same(state.actorProperties.basic_damage_per,offense.basicDamagePer)||!same(state.actorProperties.crit_damage,targetModifiers.awakerCritDamage)||
    !same(state.targetProperties.be_damage_per,targetModifiers.beDamagePer)||!same(state.targetProperties.be_damage_per2,targetModifiers.beDamagePer2)||!same(state.targetProperties.be_damage_per3,targetModifiers.beDamagePer3)||!same(state.targetProperties.vulnerable_per,targetModifiers.vulnerablePer))throw new Error('State live properties must match the prefix combat snapshot');
  delete offense.basicDamagePer;
  for(const key of ['awakerCritDamage','beDamagePer','beDamagePer2','beDamagePer3','vulnerablePer'])delete targetModifiers[key];
  const stateApplication=runStateSequenceExperiment({schemaVersion:1,kind:'morimens-state-sequence',build:input.build,otherEvents:'assumed-absent',crossesTurnBoundary:false,
    actorProperties:state.actorProperties,targetProperties:state.targetProperties,stateQueries:state.stateQueries,definitions:[state.definition],
    steps:[{type:'applyState',definitionId:stateId,request:state.request}],attackBase:{...input.attackBase,variables:input.variables,offense,targetModifiers,targetState:prefixResult.targetAfter}});
  return {...base,status:'EXPERIMENTAL',completed:stateApplication.completed,stop:stateApplication.stop,targetAfter:prefixResult.targetAfter,casterEnergyAfter:prefixResult.casterEnergyAfter,
    modeledHpLost:prefixResult.modeledHpLost,stateApplication,
    unresolvedDependencies:[...prefixResult.unresolvedDependencies,...stateApplication.unresolvedDependencies,'Only one unconditional terminal BEAddState to the caster or supplied target; no later-row observation','Command target is explicitly bound to one supplied target; no automatic target acquisition','Composition is not a connected original complete command or independent gameplay validation']};
}
