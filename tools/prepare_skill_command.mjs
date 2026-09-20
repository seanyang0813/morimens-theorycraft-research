import {runPreparedSkillExperiment} from '../engine/prepared-skill-experiment.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectCommandSupport} from '../engine/inspect-command-support.mjs';
import {prepareSkillCommand} from '../engine/prepare-skill-command.mjs';
if(![3,4].includes(process.argv.length)){console.error('Usage: node tools/prepare_skill_command.mjs request.json [execution-context.json]');process.exitCode=2;}
else try{
  const request=JSON.parse(readFileSync(process.argv[2],'utf8'));
  const keys=['skillId','skillLevel','isAwaker','breakSkillLevel','potencyLevel','overrides','variables','conditionResults','stateQueries'];
  if(!request||keys.some(key=>!Object.hasOwn(request,key))||Object.keys(request).some(key=>!keys.includes(key)))throw new Error('Explicit skill preparation request required');
  for(const name of ['variables','conditionResults','stateQueries'])if(!request[name]||typeof request[name]!=='object'||Array.isArray(request[name]))throw new Error('Explicit input maps required');
  const read=name=>{const bytes=readFileSync(new URL('../research/extracted/config/'+name+'.json',import.meta.url));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
  const skills=read('Skill'),api=read('BattleApi'),commands=read('Cmd');
  if(!Object.hasOwn(skills.data,String(request.skillId)))throw new Error('Unknown skill ID');
  const formulaExpressions=Object.fromEntries(Object.entries(api.data).filter(([name,row])=>name.startsWith('BattleFomula')&&typeof row.Data==='string').map(([name,row])=>[name,row.Data]));
  const preparation={...request,skill:skills.data[String(request.skillId)],formulaExpressions,
    evaluateCondition:expression=>{if(!Object.hasOwn(request.conditionResults,expression))throw new Error('Unresolved condition: '+expression);return request.conditionResults[expression];},
    readVariable:name=>Object.hasOwn(request.variables,name)?request.variables[name]:undefined,
    allowedFunctions:Object.keys(request.stateQueries),callFunction:(name,args)=>{
      const values=request.stateQueries[name];if(!values||args.length!==1||!Number.isSafeInteger(args[0])||!Object.hasOwn(values,String(args[0])))throw new Error('Unresolved state query: '+name);return values[String(args[0])];
    }};
  const prepared=prepareSkillCommand(preparation);
  const command=commands.data[String(prepared.commandId)];if(!command)throw new Error('Selected command missing from export');
  const effectTypes=[...new Set(Object.values(command.data_list??{}).map(row=>row.Type))];
  let execution=null;
  if(process.argv[3]){
    const context=JSON.parse(readFileSync(process.argv[3],'utf8'));
    if(!context||Object.keys(context).length!==3||!['experiment','targetBinding','lifecycle'].every(k=>Object.hasOwn(context,k)))throw new Error('Explicit execution context required');
    execution=runPreparedSkillExperiment({...context,preparation,commands:commands.data});
  }
  console.log(JSON.stringify({build:'pc-res144-build51',skillId:request.skillId,sourceHashes:{Skill:skills.sha256,BattleApi:api.sha256,Cmd:commands.sha256},prepared,execution,commandSupport:inspectCommandSupport({command,allowedFunctions:Object.keys(request.stateQueries)}),commandSummary:{effectTypes,rowCount:Object.keys(command.data_list??{}).length},executable:false},null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
