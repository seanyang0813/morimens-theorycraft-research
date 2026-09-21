import {runPreparedSkillRequest} from './prepared-skill-request.mjs';
import {resolveScalarSkillField} from './skill-field.mjs';
import {importCommandRows} from './import-command-rows.mjs';
import {compileNumericCommand} from './command-expressions.mjs';
import {calculateBlockGain} from './block-gain.mjs';
import {deriveSnapshotBlockInput} from './snapshot-block-context.mjs';
import {deriveSnapshotUltiEnergyTarget} from './snapshot-ulti-energy-context.mjs';
import {runUltiEnergyExperiment} from './ulti-energy-experiment.mjs';
import {matchesUltimateEnergyCardTypes,ultimateEnergyCardTypes} from './card-type-match.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const clone=value=>JSON.parse(JSON.stringify(value));
const preparationKeys=['skillId','skillLevel','isAwaker','breakSkillLevel','potencyLevel','overrides','variables','conditionResults','stateQueries'];
const snapshotKeys=['snapshotStage','snapshotCompleteness','casterProperties','playerProperties','cardProperties','targetProperties'];
function dense(value,label){
  if(Array.isArray(value)){if(!Array.from({length:value.length},(_,i)=>Object.hasOwn(value,i)).every(Boolean))throw new Error(`${label} must be dense`);return [...value];}
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`${label} must be a dense Lua list`);
  const keys=Object.keys(value).sort((a,b)=>Number(a)-Number(b));if(keys.some((key,i)=>key!==String(i+1)))throw new Error(`${label} must use contiguous one-based keys`);return keys.map(key=>value[key]);
}

// Catalog-backed ordinary PvE Block -> caster ultimate-energy card path.
export function runPreparedSnapshotBlockSkill(value,source){
  const input=clone(value);
  if(!exact(input,['schemaVersion','kind','build','preparation','targetBinding','lifecycle','snapshot','energy'])||input.schemaVersion!==1||input.kind!=='morimens-prepared-snapshot-block-skill')throw new Error('Expected an exact prepared snapshot Block skill request');
  if(!exact(input.preparation,preparationKeys)||!exact(input.targetBinding,['expression','resolution','targetUid'])||!exact(input.snapshot,snapshotKeys)||!exact(input.energy,['source'])||!exact(input.energy.source,['castRoleUid','cmdServerUid']))throw new Error('Exact preparation, target, snapshot and energy source inputs required');
  if(input.lifecycle!=='assumed-absent'||input.targetBinding.resolution!=='supplied-single-UpperTarget'||!Number.isSafeInteger(input.targetBinding.targetUid))throw new Error('Explicit supplied single UpperTarget and absent lifecycle required');
  if(input.snapshot.snapshotStage!=='battle-property-server-live'||input.snapshot.snapshotCompleteness!=='complete-map'||!input.preparation.isAwaker)throw new Error('Complete live Awakener property snapshots required');
  const preparedResult=runPreparedSkillRequest({schemaVersion:2,kind:'morimens-prepared-skill-request',build:input.build,preparation:input.preparation,execution:null},source);
  const skill=source.skills[String(input.preparation.skillId)],catalogTypes=dense(skill.Type,'Skill type tags');
  if(!catalogTypes.includes('Card_Defend')||new Set(catalogTypes).size!==catalogTypes.length)throw new Error('Prepared Block bridge currently requires a unique catalog Card_Defend tag');
  const route={skill,isAwaker:true,breakSkillLevel:input.preparation.breakSkillLevel,potencyLevel:input.preparation.potencyLevel,evaluate:expression=>{if(!Object.hasOwn(input.preparation.conditionResults,expression))throw new Error('Unresolved condition: '+expression);return input.preparation.conditionResults[expression];}};
  const selectedTarget=resolveScalarSkillField({...route,field:'CmdTarget'});
  if(selectedTarget.value!==input.targetBinding.expression)throw new Error('Target binding does not match the selected catalog expression');
  const paraPlus=resolveScalarSkillField({...route,field:'ParaPlus'}),resolveFunction=(name,args)=>{const values=input.preparation.stateQueries[name];if(!values||args.length!==1||!Number.isSafeInteger(args[0])||!Object.hasOwn(values,String(args[0])))throw new Error('Unresolved state query: '+name);return values[String(args[0])];};
  const paraPlusEvaluation=paraPlus.value===null?null:compileNumericCommand(paraPlus.value,{allowedFunctions:Object.keys(input.preparation.stateQueries),allowLogicalNumeric:true})(name=>input.preparation.variables[name],resolveFunction);
  const paraPlusValues=paraPlusEvaluation?.values??[];
  if(paraPlusValues.length>1)throw new Error('Prepared Block bridge supports at most one ParaPlus value');
  const imported=importCommandRows(source.commands[String(preparedResult.prepared.commandId)]),rows=imported.rows;
  if(rows.length!==2||rows[0].Type!=='BEGainBlock'||rows[0].Target!=='UpperTarget'||Object.hasOwn(rows[0],'Cond')||rows[1].Type!=='BEGainUltiEnergy'||rows[1].Target!=='CmdCaster'||Object.hasOwn(rows[1],'Cond'))throw new Error('Prepared Block bridge requires unconditional UpperTarget Block then caster energy');
  const bindings={...preparedResult.prepared.argumentBindings,...Object.fromEntries(paraPlusValues.map((item,index)=>[`ParaPlus${index+1}`,item]))},resolveVariable=name=>Object.hasOwn(bindings,name)?bindings[name]:undefined;
  const blockParameterEvaluation=compileNumericCommand(rows[0].Para,{allowedFunctions:Object.keys(input.preparation.stateQueries),allowLogicalNumeric:true})(resolveVariable,resolveFunction);
  if(blockParameterEvaluation.values.length!==1||!Number.isFinite(blockParameterEvaluation.values[0]))throw new Error('One finite Block parameter required');
  const blockPropertyDerivation=deriveSnapshotBlockInput({skillTags:catalogTypes,casterProperties:input.snapshot.casterProperties,playerProperties:input.snapshot.playerProperties,cardProperties:input.snapshot.cardProperties,targetProperties:input.snapshot.targetProperties,skillArgsPlus:paraPlusValues[0]??0});
  const block=calculateBlockGain({base:blockParameterEvaluation.values[0],modifiers:blockPropertyDerivation.modifiers,target:blockPropertyDerivation.target,storage:blockPropertyDerivation.storage});
  const energyPropertyDerivation=deriveSnapshotUltiEnergyTarget({source:input.energy.source,skillTags:catalogTypes,casterProperties:input.snapshot.casterProperties,cardProperties:input.snapshot.cardProperties,playerProperties:input.snapshot.playerProperties});
  const energyTarget=energyPropertyDerivation.target,energyParameterEvaluation=compileNumericCommand(rows[1].Para,{allowedFunctions:Object.keys(input.preparation.stateQueries),allowLogicalNumeric:true})(name=>name==='CmdCaster.ulti_energy'?energyTarget.energy:resolveVariable(name),resolveFunction);
  if(energyParameterEvaluation.values.length<1||energyParameterEvaluation.values.length>3)throw new Error('One-to-three ultimate-energy parameters required');
  const energyCardTypeMatch={cardTypes:catalogTypes,requestedTypes:[...ultimateEnergyCardTypes],matched:matchesUltimateEnergyCardTypes(catalogTypes)};
  const energy=runUltiEnergyExperiment({schemaVersion:1,kind:'morimens-ulti-energy-experiment',build:input.build,otherEvents:'assumed-absent',parameters:energyParameterEvaluation.values,source:{...input.energy.source,skillConfigId:input.preparation.skillId},targetOrder:[energyTarget.uid],targets:[{uid:energyTarget.uid,role:energyTarget.role,energy:energyTarget.energy,maximumProperties:energyTarget.maximumProperties,calculation:{dimension:energyTarget.calculation.dimension,properties:energyTarget.calculation.properties,card:{matchesEnergyCardTypes:energyCardTypeMatch.matched},casterEligible:true,skillTags:catalogTypes}}]});
  return {schemaVersion:1,kind:'morimens-prepared-snapshot-block-skill-result',analysisTrack:'theorycrafting',status:'EXPERIMENTAL',build:input.build,finalDamage:null,skillId:input.preparation.skillId,targetUid:input.targetBinding.targetUid,sourceHashes:preparedResult.sourceHashes,prepared:preparedResult.prepared,catalogTypes,targetSelection:selectedTarget,paraPlus:{selection:paraPlus,evaluation:paraPlusEvaluation,values:paraPlusValues},command:{id:preparedResult.prepared.commandId,rows,importMetadata:imported.metadata},blockParameterEvaluation,blockPropertyDerivation,block,energyParameterEvaluation,energyCardTypeMatch,energyPropertyDerivation,energy,completed:true,stop:null,unresolvedDependencies:['Ordinary Camp1 PvE Awakener instruction-card branch only; Keeper, PvP, formula-subtype and state-trigger branches are excluded','Catalog skill types stand in for the constructed card type list; dynamic type additions and temporary-card construction are excluded','The selected PlayerRole is supplied as one resolved UpperTarget; automatic target generation and legality are not simulated','Costs, effect repetition, callbacks, Block events, card lifecycle and later actions are not simulated','The result is a theorycraft model and has not passed an independent pre-outcome gameplay holdout']};
}
