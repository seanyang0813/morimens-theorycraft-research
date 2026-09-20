import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {compileNumericCommand,compileCommandCondition} from '../engine/command-expressions.mjs';
import {importCommandRows} from '../engine/import-command-rows.mjs';

const allowedFunctions=['CmdCaster.GetStateLayer','PlayerRole.GetStateLayer','UpperTarget.GetStateLayer','OwnerCard.GetStateLayer','CurCard.GetStateLayer','CmdCaster.GetPotencyLevel','CmdCaster.GetBreakSkillLevel','math.ceil','math.floor'];
const allowedTargets=new Set(['UpperTarget','FrontEnemy','RandomEnemy','AllEnemy']);
const allowedFields=new Set(['id','Type','Target','Para','Cond','VFX','DelayTime']);

export function auditReplayCandidateRows(commands,{sourceSha256=null}={}){
  if(!commands||Array.isArray(commands)||typeof commands!=='object')throw new Error('Exported command catalog required');
  const blockerCounts={},commandRows=[];let ordinaryActiveRows=0,conditionalRows=0,rowExpressionCompatible=0,commandsWithOrdinaryActive=0,commandShapeCompatible=0;
  const add=code=>blockerCounts[code]=(blockerCounts[code]??0)+1;
  for(const [commandId,command] of Object.entries(commands)){
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
  return {schemaVersion:1,kind:'MORIMENS_REPLAY_CANDIDATE_ROW_AUDIT',build:'pc-res144-build51',sourceSha256,commandsWithOrdinaryActive,ordinaryActiveRows,conditionalRows,rowExpressionCompatible,commandShapeCompatible,blockerCounts:Object.fromEntries(Object.entries(blockerCounts).sort()),
    allowedFunctions:[...allowedFunctions],allowedTargets:[...allowedTargets],commands:commandRows,
    scope:'Static syntax/shape compatibility for retrospective replay hit-row selection. Runtime variables, condition outcomes, target identity, hit count, property completeness, critical RNG and gameplay correctness are not established.'};
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
  const input=process.argv[2]??'research/extracted/config/Cmd.json',output=process.argv[3]??'research/evidence/replay-candidate-row-audit.json',bytes=readFileSync(input),commands=JSON.parse(bytes);
  const result=auditReplayCandidateRows(commands,{sourceSha256:createHash('sha256').update(bytes).digest('hex')});writeFileSync(output,JSON.stringify(result,null,2)+'\n');
  console.log(`Wrote ${result.commandShapeCompatible}/${result.commandsWithOrdinaryActive} shape-compatible ordinary-Active commands to ${output}`);
}
