import {runPreparedSkillRequest} from './prepared-skill-request.mjs';
import {resolveScalarSkillField} from './skill-field.mjs';
import {importCommandRows} from './import-command-rows.mjs';
import {compileNumericCommand} from './command-expressions.mjs';
import {initializeActiveDamageForBuild} from './active-damage-command.mjs';
import {runSnapshotActiveSequence} from './snapshot-active-sequence.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const clone=value=>JSON.parse(JSON.stringify(value));
const topKeys=['schemaVersion','kind','build','preparation','targetBinding','lifecycle','snapshot','repeatModifiers'];
const preparationKeys=['skillId','skillLevel','isAwaker','breakSkillLevel','potencyLevel','overrides','variables','conditionResults','stateQueries'];
const snapshotKeys=['snapshotStage','snapshotCompleteness','casterProperties','playerProperties','initialTargetProperties','cardProperties','cardContext','tags','targetBattleTag','targetStateIds','critRolls'];

// Strict catalog-to-snapshot bridge for the smallest recovered Active command shape.
export function runPreparedSnapshotActiveSkill(value,source){
  const input=clone(value);
  if(!exact(input,topKeys)||input.schemaVersion!==1||input.kind!=='morimens-prepared-snapshot-active-skill')throw new Error('Expected an exact prepared snapshot Active skill request');
  if(!exact(input.preparation,preparationKeys)||!exact(input.targetBinding,['expression','resolution'])||!exact(input.snapshot,snapshotKeys)||!exact(input.repeatModifiers,['plus','per']))throw new Error('Exact preparation, target, snapshot and repetition inputs required');
  if(input.lifecycle!=='assumed-absent')throw new Error('Only an explicitly absent intervening lifecycle is supported');
  if(input.targetBinding.resolution!=='supplied-single-UpperTarget')throw new Error('Only a supplied single UpperTarget is supported');
  if(!Number.isFinite(input.repeatModifiers.plus)||!Number.isFinite(input.repeatModifiers.per))throw new Error('Finite repetition modifiers required');

  const preparedResult=runPreparedSkillRequest({schemaVersion:2,kind:'morimens-prepared-skill-request',build:input.build,preparation:input.preparation,execution:null},source);
  const skill=source.skills[String(input.preparation.skillId)];
  const evaluate=expression=>{
    if(!Object.hasOwn(input.preparation.conditionResults,expression))throw new Error('Unresolved condition: '+expression);
    return input.preparation.conditionResults[expression];
  };
  const route={skill,isAwaker:input.preparation.isAwaker,breakSkillLevel:input.preparation.breakSkillLevel,potencyLevel:input.preparation.potencyLevel,evaluate};
  const selectedTarget=resolveScalarSkillField({...route,field:'CmdTarget'});
  if(selectedTarget.value!==input.targetBinding.expression)throw new Error('Target binding does not match the selected catalog expression');
  const paraPlus=resolveScalarSkillField({...route,field:'ParaPlus'});
  if(paraPlus.value!==null)throw new Error('Catalog ParaPlus is outside the prepared snapshot Active bridge');

  const imported=importCommandRows(source.commands[String(preparedResult.prepared.commandId)]);
  if(imported.rows.length!==1)throw new Error('Prepared snapshot Active bridge requires exactly one command row');
  const row=imported.rows[0];
  if(row.Type!=='BEActiveDamage'||row.Target!=='UpperTarget'||Object.hasOwn(row,'Cond'))throw new Error('Prepared snapshot Active bridge requires one unconditional UpperTarget BEActiveDamage row');
  const bindings=preparedResult.prepared.argumentBindings;
  const resolveVariable=name=>Object.hasOwn(bindings,name)?bindings[name]:undefined;
  const resolveFunction=(name,args)=>{
    const values=input.preparation.stateQueries[name];
    if(!values||args.length!==1||!Number.isSafeInteger(args[0])||!Object.hasOwn(values,String(args[0])))throw new Error('Unresolved state query: '+name);
    return values[String(args[0])];
  };
  const parameterEvaluation=compileNumericCommand(row.Para,{allowedFunctions:Object.keys(input.preparation.stateQueries),allowLogicalNumeric:true})(resolveVariable,resolveFunction);
  if(parameterEvaluation.values.length<1||parameterEvaluation.values.length>3)throw new Error('Only one-to-three Active parameters without ParaPlus are supported');
  const [baseValue,repeat=null,damageSubtype=0]=parameterEvaluation.values;
  if(damageSubtype!==0)throw new Error('Only ordinary Active damage subtype 0 is supported');
  const repetition=initializeActiveDamageForBuild({build:input.build,repeat,plus:input.repeatModifiers.plus,per:input.repeatModifiers.per});
  if(!Array.isArray(input.snapshot.critRolls)||input.snapshot.critRolls.length!==repetition.totalEffectTimes)throw new Error('One explicit critical roll entry is required for every derived hit');

  const hits=input.snapshot.critRolls.map((critRoll,index)=>({id:`derived-hit-${index+1}`,baseValue,skillArgsPlus:0,tags:input.snapshot.tags,cardProperties:input.snapshot.cardProperties,cardContext:input.snapshot.cardContext,targetContext:{critRoll,targetBattleTag:input.snapshot.targetBattleTag,targetStateIds:input.snapshot.targetStateIds},hitContext:{damageSubtype:'Ordinary'}}));
  const derivedSequenceInput={schemaVersion:1,kind:'morimens-snapshot-active-sequence',build:input.build,snapshotStage:input.snapshot.snapshotStage,snapshotCompleteness:input.snapshot.snapshotCompleteness,interveningEffects:'assumed-absent',casterProperties:input.snapshot.casterProperties,playerProperties:input.snapshot.playerProperties,initialTargetProperties:input.snapshot.initialTargetProperties,hits};
  const calculation=runSnapshotActiveSequence(derivedSequenceInput);
  return {schemaVersion:1,kind:'morimens-prepared-snapshot-active-skill-result',analysisTrack:'theorycrafting',status:'EXPERIMENTAL',build:input.build,finalDamage:null,skillId:input.preparation.skillId,sourceHashes:preparedResult.sourceHashes,prepared:preparedResult.prepared,targetSelection:selectedTarget,command:{id:preparedResult.prepared.commandId,row,importMetadata:imported.metadata},parameterEvaluation,repetition,derivedSequenceInput,calculation,unresolvedDependencies:['Target selection is supplied as one resolved UpperTarget; the catalog target expression is checked but not executed','Costs, card construction, triggers, state changes, callbacks, statistics, retargeting and death execution are not simulated','Only a one-row unconditional ordinary Active command without ParaPlus is accepted','The result is a theorycraft model and has not passed an independent pre-outcome gameplay holdout']};
}
