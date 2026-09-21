import {snapshot} from './experiments.mjs';
import {prepareSkillCommand} from './prepare-skill-command.mjs';
import {prepareCardCommandPlan} from './card-command-plan.mjs';
import {importCommandRows} from './import-command-rows.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const map=value=>value&&typeof value==='object'&&!Array.isArray(value);

// Resolve a generated card's command and numeric base arguments from hashed exports,
// then apply the copied card arguments at the tested GetSkillArgs boundary.
export function prepareCatalogCardCommandPlan(value,source){
  const input=snapshot(value);
  if(!exact(input,['schemaVersion','kind','build','card','preCmdId','progression'])||input.schemaVersion!==1||input.kind!=='morimens-catalog-card-command-plan')throw new Error('Explicit catalog card command plan required');
  if(!exact(input.progression,['isAwaker','breakSkillLevel','potencyLevel','variables','conditionResults','stateQueries']))throw new Error('Explicit card progression context required');
  const progression=input.progression;
  for(const name of ['variables','conditionResults','stateQueries'])if(!map(progression[name]))throw new Error(`Explicit ${name} map required`);
  if(Object.values(progression.variables).some(number=>!Number.isFinite(number)))throw new Error('Card variables must be finite numbers');
  if(Object.values(progression.conditionResults).some(result=>typeof result!=='boolean'))throw new Error('Card conditions must be booleans');
  if(Object.entries(progression.stateQueries).some(([name,values])=>!name||!map(values)||Object.entries(values).some(([id,result])=>!Number.isSafeInteger(Number(id))||!Number.isFinite(result))))throw new Error('Card state queries require integer-ID to finite-number maps');
  if(!source||!exact(source,['build','skills','battleApi','commands','sourceHashes'])||source.build!==input.build||!map(source.skills)||!map(source.battleApi)||!map(source.commands)||!exact(source.sourceHashes,['Skill','BattleApi','Cmd'])||Object.values(source.sourceHashes).some(hash=>!(/^[0-9a-f]{64}$/i).test(hash)))throw new Error('Matching versioned Skill, BattleApi and Cmd context required');
  if(!input.card||!Number.isSafeInteger(input.card.tid)||!Number.isSafeInteger(input.card.level)||input.card.level<1)throw new Error('Card skill identity and level required');
  const skill=source.skills[String(input.card.tid)];
  if(!skill)throw new Error('Generated card skill missing from export');
  const formulaExpressions=Object.fromEntries(Object.entries(source.battleApi).filter(([name,row])=>name.startsWith('BattleFomula')&&typeof row?.Data==='string').map(([name,row])=>[name,row.Data]));
  const prepared=prepareSkillCommand({skill,skillLevel:input.card.level,isAwaker:progression.isAwaker,breakSkillLevel:progression.breakSkillLevel,potencyLevel:progression.potencyLevel,formulaExpressions,overrides:[],
    evaluateCondition:expression=>{if(!Object.hasOwn(progression.conditionResults,expression))throw new Error('Unresolved card condition: '+expression);return progression.conditionResults[expression];},
    allowedFunctions:Object.keys(progression.stateQueries),readVariable:name=>Object.hasOwn(progression.variables,name)?progression.variables[name]:undefined,
    callFunction:(name,args)=>{const values=progression.stateQueries[name];if(!values||args.length!==1||!Number.isSafeInteger(args[0])||!Object.hasOwn(values,String(args[0])))throw new Error('Unresolved card state query: '+name);return values[String(args[0])];}});
  const command=source.commands[String(prepared.commandId)];
  if(!command)throw new Error('Generated card command missing from export');
  const imported=importCommandRows(command),effectTypes=[...new Set(imported.rows.map(row=>row.Type))];
  const plan=prepareCardCommandPlan({schemaVersion:1,kind:'morimens-card-command-plan',build:input.build,card:input.card,preCmdId:input.preCmdId,cmdId:prepared.commandId,rawSkillArguments:prepared.arguments});
  return {schemaVersion:1,status:'EXPERIMENTAL',build:input.build,sourceHashes:{...source.sourceHashes},skillId:input.card.tid,commandId:prepared.commandId,baseArguments:prepared.arguments,prepared,command:{rowCount:imported.rows.length,effectTypes,rows:imported.rows,metadata:imported.metadata},plan,
    unresolvedDependencies:[...new Set([...prepared.unresolvedDependencies,...plan.unresolvedDependencies,'Skill, BattleApi and Cmd exports are caller-supplied versioned inputs','Command rows are preserved but not executed by this plan'])]};
}
