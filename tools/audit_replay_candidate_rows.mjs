import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {compileNumericCommand,compileCommandCondition} from '../engine/command-expressions.mjs';
import {importCommandRows} from '../engine/import-command-rows.mjs';

const allowedFunctions=['CmdCaster.GetStateLayer','PlayerRole.GetStateLayer','UpperTarget.GetStateLayer','OwnerCard.GetStateLayer','CurCard.GetStateLayer','CmdCaster.GetPotencyLevel','CmdCaster.GetBreakSkillLevel','math.ceil','math.floor'];
const allowedTargets=new Set(['UpperTarget','FrontEnemy','RandomEnemy','AllEnemy','MaxHpEnemy','MinHpEnemy','MaxHpAndBlockEnemy','MinHpAndBlockEnemy']);
const allowedFields=new Set(['id','Type','Target','Para','Cond','VFX','DelayTime']);
const supportedTags=new Set(['Card_Strike','Card_Skill','Ulti_Skill','Card_AttachPost']);
const leaves=(value,type)=>value&&typeof value==='object'?Object.values(value).flatMap(item=>leaves(item,type)):typeof value===type?[value]:[];

export function auditReplayCandidateRows(commands,skills,{sourceSha256=null}={}){
  if(!commands||Array.isArray(commands)||typeof commands!=='object'||!skills||Array.isArray(skills)||typeof skills!=='object')throw new Error('Exported command and skill catalogs required');
  const relevantSkills=[],relevantCommandIds=new Set();
  for(const [skillId,skill] of Object.entries(skills)){
    const tags=[...new Set(leaves(skill?.Type,'string'))];
    if(!Number.isSafeInteger(skill?.AwakerID)||!tags.some(tag=>supportedTags.has(tag)))continue;
    const ids=[...new Set([...leaves(skill.CmdList,'number'),...leaves(skill.tempCmdList,'number')].filter(id=>Number.isSafeInteger(id)&&id>0&&Object.hasOwn(commands,String(id))))];
    ids.forEach(id=>relevantCommandIds.add(id));relevantSkills.push({skillId:Number(skillId),tags,commandIds:ids});
  }
  const blockerCounts={},commandRows=[];let ordinaryActiveRows=0,conditionalRows=0,rowExpressionCompatible=0,commandsWithOrdinaryActive=0,commandShapeCompatible=0;
  const add=code=>blockerCounts[code]=(blockerCounts[code]??0)+1;
  for(const [commandId,command] of Object.entries(commands)){
    if(!relevantCommandIds.has(Number(commandId)))continue;
    let imported;
    try{imported=importCommandRows(command);}catch(error){continue;}
    const active=imported.rows.filter(row=>row.Type==='BEActiveDamage');
    if(!active.length)continue;
    commandsWithOrdinaryActive++;ordinaryActiveRows+=active.length;
    const competing=imported.rows.some(row=>row.Type!=='BEActiveDamage'&&/Damage/.test(row.Type));
    if(competing)add('COMPETING_DAMAGE_EFFECT');
    const rows=active.map(row=>{
      const blockers=[];
      const block=code=>{blockers.push(code);add(code);};
      if(Object.keys(row).some(key=>!allowedFields.has(key)))block('ROW_FIELD');
      if(!allowedTargets.has(row.Target))block('TARGET_SELECTOR');
      try{compileNumericCommand(row.Para,{allowedFunctions});}catch{block('PARAMETER_EXPRESSION');}
      if(Object.hasOwn(row,'Cond')){
        conditionalRows++;
        try{compileCommandCondition(row.Cond,{allowedFunctions});}catch{block('CONDITION_EXPRESSION');}
      }
      if(!blockers.length)rowExpressionCompatible++;
      return {rowId:row.id,target:row.Target,conditional:Object.hasOwn(row,'Cond'),blockers};
    });
    const compatible=!competing&&rows.every(row=>row.blockers.length===0);if(compatible)commandShapeCompatible++;
    commandRows.push({commandId:Number(commandId),ordinaryActiveRows:rows,competingDamageEffect:competing,shapeCompatible:compatible});
  }
  return {schemaVersion:1,kind:'MORIMENS_REPLAY_CANDIDATE_ROW_AUDIT',build:'pc-res144-build51',sourceSha256,relevantAwakenerSkills:relevantSkills.length,relevantLinkedCommands:relevantCommandIds.size,commandsWithOrdinaryActive,ordinaryActiveRows,conditionalRows,rowExpressionCompatible,commandShapeCompatible,blockerCounts:Object.fromEntries(Object.entries(blockerCounts).sort()),
    allowedFunctions:[...allowedFunctions],allowedTargets:[...allowedTargets],supportedTags:[...supportedTags],skills:relevantSkills,commands:commandRows,
    scope:'Static syntax/shape compatibility for commands linked by supported-tag Awakener skills and retrospective replay hit-row selection. Runtime variables, condition outcomes, target identity, hit count, property completeness, critical RNG and gameplay correctness are not established.'};
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
  const commandPath=process.argv[2]??'research/extracted/config/Cmd.json',skillPath=process.argv[3]??'research/extracted/config/Skill.json',output=process.argv[4]??'research/evidence/replay-candidate-row-audit.json',commandBytes=readFileSync(commandPath),skillBytes=readFileSync(skillPath),commands=JSON.parse(commandBytes),skills=JSON.parse(skillBytes);
  const result=auditReplayCandidateRows(commands,skills,{sourceSha256:{Cmd:createHash('sha256').update(commandBytes).digest('hex'),Skill:createHash('sha256').update(skillBytes).digest('hex')}});writeFileSync(output,JSON.stringify(result,null,2)+'\n');
  console.log(`Wrote ${result.commandShapeCompatible}/${result.commandsWithOrdinaryActive} shape-compatible ordinary-Active commands to ${output}`);
}
