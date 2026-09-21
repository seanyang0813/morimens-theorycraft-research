import {inspectCommandSupport} from './inspect-command-support.mjs';
import {prepareSkillCommand} from './prepare-skill-command.mjs';
import {runPreparedSkillExperiment} from './prepared-skill-experiment.mjs';

const preparationKeys=['skillId','skillLevel','isAwaker','breakSkillLevel','potencyLevel','overrides','variables','conditionResults','stateQueries'];
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const map=value=>value&&typeof value==='object'&&!Array.isArray(value);

// Serializable bridge from exported skill IDs to the existing prepared-command engine.
export function runPreparedSkillRequest(value,source){
  if(!exact(value,['schemaVersion','kind','preparation','execution'])||value.schemaVersion!==1||value.kind!=='morimens-prepared-skill-request')throw new Error('Expected an exact version 1 prepared-skill request');
  if(!exact(value.preparation,preparationKeys))throw new Error('Explicit skill preparation inputs required');
  const request=value.preparation;
  for(const name of ['variables','conditionResults','stateQueries'])if(!map(request[name]))throw new Error(`Explicit ${name} map required`);
  if(Object.values(request.variables).some(number=>!Number.isFinite(number)))throw new Error('Preparation variables must be finite numbers');
  if(Object.values(request.conditionResults).some(result=>typeof result!=='boolean'))throw new Error('Condition results must be booleans');
  if(Object.entries(request.stateQueries).some(([name,values])=>!name||!map(values)||Object.entries(values).some(([id,result])=>!Number.isSafeInteger(Number(id))||!Number.isFinite(result))))throw new Error('State queries require integer-ID to finite-number maps');
  if(!source||!map(source.skills)||!map(source.battleApi)||!map(source.commands)||!map(source.states)||!exact(source.sourceHashes,['Skill','BattleApi','Cmd','State'])||Object.values(source.sourceHashes).some(hash=>!(/^[0-9a-f]{64}$/i).test(hash)))throw new Error('Versioned Skill, BattleApi, Cmd and State context required');
  const skill=source.skills[String(request.skillId)];
  if(!skill)throw new Error('Unknown skill ID');
  const formulaExpressions=Object.fromEntries(Object.entries(source.battleApi).filter(([name,row])=>name.startsWith('BattleFomula')&&typeof row?.Data==='string').map(([name,row])=>[name,row.Data]));
  const preparation={...request,skill,formulaExpressions,
    evaluateCondition:expression=>{if(!Object.hasOwn(request.conditionResults,expression))throw new Error('Unresolved condition: '+expression);return request.conditionResults[expression];},
    readVariable:name=>Object.hasOwn(request.variables,name)?request.variables[name]:undefined,
    allowedFunctions:Object.keys(request.stateQueries),callFunction:(name,args)=>{
      const values=request.stateQueries[name];
      if(!values||args.length!==1||!Number.isSafeInteger(args[0])||!Object.hasOwn(values,String(args[0])))throw new Error('Unresolved state query: '+name);
      return values[String(args[0])];
    }};
  const prepared=prepareSkillCommand(preparation);
  const command=source.commands[String(prepared.commandId)];
  if(!command)throw new Error('Selected command missing from export');
  const effectTypes=[...new Set(Object.values(command.data_list??{}).map(row=>row.Type))];
  let execution=null;
  if(value.execution!==null){
    if(!exact(value.execution,['experiment','targetBinding','lifecycle']))throw new Error('Exact execution context or null required');
    execution=runPreparedSkillExperiment({...value.execution,preparation,commands:source.commands,states:source.states});
  }
  return {schemaVersion:1,status:execution?.status??'PREPARED',build:'pc-res144-build51',finalDamage:null,skillId:request.skillId,sourceHashes:{...source.sourceHashes},prepared,execution,
    commandSupport:execution?.support??inspectCommandSupport({command,allowedFunctions:Object.keys(request.stateQueries)}),commandSummary:{effectTypes,rowCount:Object.keys(command.data_list??{}).length},
    unresolvedDependencies:execution?.unresolvedDependencies??[...prepared.unresolvedDependencies,'Command prepared but not executed; supply an explicit execution context','No automatic build, target, lifecycle or gameplay validation']};
}
