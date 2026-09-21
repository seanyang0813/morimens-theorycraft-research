import {runPreparedSkillRequest} from './prepared-skill-request.mjs';
import {resolveScalarSkillField} from './skill-field.mjs';
import {importCommandRows} from './import-command-rows.mjs';
import {compileNumericCommand} from './command-expressions.mjs';
import {initializeActiveDamageForBuild} from './active-damage-command.mjs';
import {runSnapshotActiveSequence} from './snapshot-active-sequence.mjs';
import {runUltiEnergyExperiment} from './ulti-energy-experiment.mjs';
import {matchesUltimateEnergyCardTypes,ultimateEnergyCardTypes} from './card-type-match.mjs';
import {compileCommandCondition} from './command-expressions.mjs';
import {selectFrontEnemy} from './front-enemy-target.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const clone=value=>JSON.parse(JSON.stringify(value));
const topKeys=['schemaVersion','kind','build','preparation','targetBinding','lifecycle','snapshot','repeatModifiers'];
const mixedTopKeys=[...topKeys,'energy'];
const multiTopKeys=mixedTopKeys.filter(key=>key!=='repeatModifiers');
const preparationKeys=['skillId','skillLevel','isAwaker','breakSkillLevel','potencyLevel','overrides','variables','conditionResults','stateQueries'];
const snapshotKeys=['snapshotStage','snapshotCompleteness','casterProperties','playerProperties','initialTargetProperties','cardProperties','targetBattleTag','targetStateIds','critRolls'];
const supportedTags=new Set(['Card_Strike','Card_Skill','Ulti_Skill','Card_AttachPost']);
const instructionTags=new Set(['Card_Strike','Card_Skill','Card_Defend','Card_Extend']);
function dense(value,label){
  if(Array.isArray(value)){if(!Array.from({length:value.length},(_,i)=>Object.hasOwn(value,i)).every(Boolean))throw new Error(`${label} must be dense`);return [...value];}
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`${label} must be a dense Lua list`);
  const keys=Object.keys(value).sort((a,b)=>Number(a)-Number(b));if(keys.some((key,i)=>key!==String(i+1)))throw new Error(`${label} must use contiguous one-based keys`);return keys.map(key=>value[key]);
}

// Strict catalog-to-snapshot bridge for the smallest recovered Active command shape.
export function runPreparedSnapshotActiveSkill(value,source){
  const input=clone(value);
  const multi=input?.schemaVersion===3,mixed=input?.schemaVersion===2||multi;
  if(!(multi?exact(input,multiTopKeys):mixed?exact(input,mixedTopKeys):exact(input,topKeys))||![1,2,3].includes(input.schemaVersion)||input.kind!=='morimens-prepared-snapshot-active-skill')throw new Error('Expected an exact prepared snapshot Active skill request');
  const targetKeys=multi?['expression','resolution','targetUid','context']:['expression','resolution'];
  if(!exact(input.preparation,preparationKeys)||!exact(input.targetBinding,targetKeys)||!exact(input.snapshot,snapshotKeys)||(!multi&&!exact(input.repeatModifiers,['plus','per'])))throw new Error('Exact preparation, target, snapshot and repetition inputs required');
  if(input.lifecycle!=='assumed-absent')throw new Error('Only an explicitly absent intervening lifecycle is supported');
  if(!multi&&input.targetBinding.resolution!=='supplied-single-UpperTarget')throw new Error('Only a supplied single UpperTarget is supported');
  if(multi&&input.targetBinding.resolution!=='front-enemy-context')throw new Error('Schema 3 requires recovered FrontEnemy resolution');
  const repeatModifiers=multi?{plus:input.snapshot.casterProperties?.damagetimes_plus??0,per:input.snapshot.casterProperties?.damagetimes_per??0}:input.repeatModifiers;
  if(!Number.isFinite(repeatModifiers.plus)||!Number.isFinite(repeatModifiers.per))throw new Error('Finite repetition modifiers required');
  const repeatModifierDerivation=multi?{source:'casterProperties.GetProperty zero-default',plus:{property:'damagetimes_plus',present:Object.hasOwn(input.snapshot.casterProperties,'damagetimes_plus'),value:repeatModifiers.plus},per:{property:'damagetimes_per',present:Object.hasOwn(input.snapshot.casterProperties,'damagetimes_per'),value:repeatModifiers.per}}:null;

  const preparedResult=runPreparedSkillRequest({schemaVersion:2,kind:'morimens-prepared-skill-request',build:input.build,preparation:input.preparation,execution:null},source);
  const skill=source.skills[String(input.preparation.skillId)];
  const catalogTypes=dense(skill.Type,'Skill type tags');
  const tags=catalogTypes.filter(tag=>supportedTags.has(tag));
  if(!tags.length||new Set(tags).size!==tags.length)throw new Error('Prepared snapshot Active bridge requires unique catalog-backed Awakener damage tags');
  const cardContext={present:true,instructionCard:catalogTypes.some(tag=>instructionTags.has(tag)),stateTriggerAdd:false};
  const evaluate=expression=>{
    if(!Object.hasOwn(input.preparation.conditionResults,expression))throw new Error('Unresolved condition: '+expression);
    return input.preparation.conditionResults[expression];
  };
  const route={skill,isAwaker:input.preparation.isAwaker,breakSkillLevel:input.preparation.breakSkillLevel,potencyLevel:input.preparation.potencyLevel,evaluate};
  const selectedTarget=resolveScalarSkillField({...route,field:'CmdTarget'});
  if(selectedTarget.value!==input.targetBinding.expression)throw new Error('Target binding does not match the selected catalog expression');
  let targetResolution=null;
  if(multi){
    if(selectedTarget.value!=='FrontEnemy'||!Number.isSafeInteger(input.targetBinding.targetUid))throw new Error('Schema 3 requires a selected FrontEnemy target UID');
    targetResolution=selectFrontEnemy(input.targetBinding.context);
    if(targetResolution.targets.length!==1||targetResolution.targets[0]!==input.targetBinding.targetUid)throw new Error('Selected FrontEnemy does not match the supplied snapshot target');
  }
  const paraPlus=resolveScalarSkillField({...route,field:'ParaPlus'});
  const resolveFunction=(name,args)=>{
    const values=input.preparation.stateQueries[name];
    if(!values||args.length!==1||!Number.isSafeInteger(args[0])||!Object.hasOwn(values,String(args[0])))throw new Error('Unresolved state query: '+name);
    return values[String(args[0])];
  };
  const paraPlusEvaluation=paraPlus.value===null?null:compileNumericCommand(paraPlus.value,{allowedFunctions:Object.keys(input.preparation.stateQueries),allowLogicalNumeric:true})(name=>Object.hasOwn(input.preparation.variables,name)?input.preparation.variables[name]:undefined,resolveFunction);
  const paraPlusBindings=Object.fromEntries((paraPlusEvaluation?.values??[]).map((item,index)=>[`ParaPlus${index+1}`,item]));

  const imported=importCommandRows(source.commands[String(preparedResult.prepared.commandId)]);
  if(!multi&&imported.rows.length!==(mixed?2:1))throw new Error(`Prepared snapshot Active bridge requires exactly ${mixed?'damage and energy':'one'} command row${mixed?'s':''}`);
  if(multi&&imported.rows.length<3)throw new Error('Schema 3 requires multiple Active rows followed by energy');
  const row=imported.rows[0],energyRow=mixed?imported.rows.at(-1):null,activeRows=multi?imported.rows.slice(0,-1):[row];
  if(!multi&&(row.Type!=='BEActiveDamage'||row.Target!=='UpperTarget'||Object.hasOwn(row,'Cond')))throw new Error('Prepared snapshot Active bridge requires one unconditional UpperTarget BEActiveDamage row first');
  if(multi&&activeRows.some(item=>item.Type!=='BEActiveDamage'||!['FrontEnemy','UpperTarget'].includes(item.Target)))throw new Error('Schema 3 supports only selected-target Active rows before energy');
  if(mixed&&(energyRow.Type!=='BEGainUltiEnergy'||energyRow.Target!=='CmdCaster'||Object.hasOwn(energyRow,'Cond')))throw new Error(`${multi?'Schema 3':'Version 2'} requires one unconditional caster energy row after damage`);
  const bindings={...preparedResult.prepared.argumentBindings,...paraPlusBindings};
  const resolveVariable=name=>Object.hasOwn(bindings,name)?bindings[name]:undefined;
  let lastConditionRet=false;
  const conditionFunctions=[...new Set([...Object.keys(input.preparation.stateQueries),'CmdCaster.GetPotencyLevel'])];
  const conditionCall=(name,args)=>name==='CmdCaster.GetPotencyLevel'?(args.length===0?input.preparation.potencyLevel:undefined):resolveFunction(name,args);
  const conditionRead=name=>name==='LastConditionRet'?(lastConditionRet?1:0):resolveVariable(name);
  const rowExecutions=[],pendingHits=[];
  for(const activeRow of activeRows){
    let condition=null;
    if(Object.hasOwn(activeRow,'Cond')){
      condition=compileCommandCondition(activeRow.Cond,{allowedFunctions:conditionFunctions})(conditionRead,conditionCall);
      lastConditionRet=condition.passed;
    }
    if(condition&&!condition.passed){rowExecutions.push({rowId:activeRow.id,target:activeRow.Target,condition,executed:false,parameterEvaluation:null,repetition:null});continue;}
    const parameterEvaluation=compileNumericCommand(activeRow.Para,{allowedFunctions:Object.keys(input.preparation.stateQueries),allowLogicalNumeric:true})(resolveVariable,resolveFunction);
    if(parameterEvaluation.values.length<1||parameterEvaluation.values.length>4)throw new Error('Only one-to-four Active parameters are supported');
    const [baseValue,repeat=null,damageSubtype=0,skillArgsPlus=0]=parameterEvaluation.values;
    if(![0,1].includes(damageSubtype))throw new Error('Only ordinary or Puncture Active damage is supported');
    if(!Number.isFinite(skillArgsPlus))throw new Error('Finite resolved Active ParaPlus required');
    const repetition=initializeActiveDamageForBuild({build:input.build,repeat,plus:repeatModifiers.plus,per:repeatModifiers.per});
    const execution={rowId:activeRow.id,target:activeRow.Target,condition,executed:true,parameterEvaluation,repetition};rowExecutions.push(execution);
    for(let index=0;index<repetition.totalEffectTimes;index++)pendingHits.push({rowId:activeRow.id,index:index+1,baseValue,skillArgsPlus,damageSubtype:damageSubtype===1?'Puncture':'Ordinary'});
  }
  if(!Array.isArray(input.snapshot.critRolls)||input.snapshot.critRolls.length!==pendingHits.length)throw new Error('One explicit critical roll entry is required for every derived hit');
  const hits=pendingHits.map((hit,index)=>({id:`derived-row-${hit.rowId}-hit-${hit.index}`,baseValue:hit.baseValue,skillArgsPlus:hit.skillArgsPlus,tags,cardProperties:input.snapshot.cardProperties,cardContext,targetContext:{critRoll:input.snapshot.critRolls[index],targetBattleTag:input.snapshot.targetBattleTag,targetStateIds:input.snapshot.targetStateIds},hitContext:{damageSubtype:hit.damageSubtype}}));
  const parameterEvaluation=multi?null:rowExecutions[0].parameterEvaluation,repetition=multi?null:rowExecutions[0].repetition;
  const derivedSequenceInput={schemaVersion:1,kind:'morimens-snapshot-active-sequence',build:input.build,snapshotStage:input.snapshot.snapshotStage,snapshotCompleteness:input.snapshot.snapshotCompleteness,interveningEffects:'assumed-absent',casterProperties:input.snapshot.casterProperties,playerProperties:input.snapshot.playerProperties,initialTargetProperties:input.snapshot.initialTargetProperties,hits};
  const calculation=runSnapshotActiveSequence(derivedSequenceInput);
  let energy=null,energyParameterEvaluation=null,energyCardTypeMatch=null,stop=calculation.stop;
  if(mixed){
    if(!exact(input.energy,['source','target'])||!exact(input.energy.source,['castRoleUid','cmdServerUid'])||!exact(input.energy.target,['uid','role','energy','maximumProperties','calculation'])||!exact(input.energy.target.calculation,['dimension','properties'])||input.energy.target.role!=='Awaker'||input.energy.source.castRoleUid!==input.energy.target.uid)throw new Error('Explicit self-target Awakener energy context required');
    energyCardTypeMatch={cardTypes:catalogTypes,requestedTypes:[...ultimateEnergyCardTypes],matched:matchesUltimateEnergyCardTypes(catalogTypes)};
    energyParameterEvaluation=compileNumericCommand(energyRow.Para,{allowedFunctions:Object.keys(input.preparation.stateQueries),allowLogicalNumeric:true})(name=>name==='CmdCaster.ulti_energy'?input.energy.target.energy:resolveVariable(name),resolveFunction);
    if(energyParameterEvaluation.values.length<1||energyParameterEvaluation.values.length>3)throw new Error('One-to-three ultimate-energy parameters required');
    if(calculation.targetAfter.hp<=0)stop={afterHitId:calculation.trace.at(-1)?.hitId??null,reason:'Death handling required before later energy row'};
    else{
      const target=input.energy.target;
      energy=runUltiEnergyExperiment({schemaVersion:1,kind:'morimens-ulti-energy-experiment',build:input.build,otherEvents:'assumed-absent',parameters:energyParameterEvaluation.values,source:{...input.energy.source,skillConfigId:input.preparation.skillId},targetOrder:[target.uid],targets:[{uid:target.uid,role:target.role,energy:target.energy,maximumProperties:target.maximumProperties,calculation:{dimension:target.calculation.dimension,properties:target.calculation.properties,card:{matchesEnergyCardTypes:energyCardTypeMatch.matched},casterEligible:true,skillTags:tags}}]});
    }
  }
  return {schemaVersion:input.schemaVersion,kind:'morimens-prepared-snapshot-active-skill-result',analysisTrack:'theorycrafting',status:'EXPERIMENTAL',build:input.build,finalDamage:null,skillId:input.preparation.skillId,sourceHashes:preparedResult.sourceHashes,prepared:preparedResult.prepared,catalogTypes,tags,cardContext,targetSelection:selectedTarget,targetResolution,paraPlus:{selection:paraPlus,evaluation:paraPlusEvaluation,bindings:paraPlusBindings},command:{id:preparedResult.prepared.commandId,row,rows:imported.rows,importMetadata:imported.metadata},rowExecutions,parameterEvaluation,repetition,repeatModifierDerivation,derivedSequenceInput,calculation,energyParameterEvaluation,energyCardTypeMatch,energy,completed:calculation.completed&&stop===null,stop,unresolvedDependencies:[multi?'FrontEnemy is resolved from the supplied role snapshot; later rows retain that target and do not retarget':'Target selection is supplied as one resolved UpperTarget; the catalog target expression is checked but not executed','Costs, card construction, triggers, state changes, callbacks, statistics, retargeting and death execution are not simulated',multi?'Schema 3 accepts only selected-target Active rows followed by one caster ultimate-energy row':mixed?'Version 2 accepts only one ordinary Active row followed by one caster ultimate-energy row':'Version 1 accepts only one ordinary Active row','The result is a theorycraft model and has not passed an independent pre-outcome gameplay holdout']};
}
