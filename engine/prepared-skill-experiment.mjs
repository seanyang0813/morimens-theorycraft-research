import {runDamageEnergyCommand} from './damage-energy-command.mjs';
import {selectFrontEnemy} from './front-enemy-target.mjs';
import {prepareSkillCommand} from './prepare-skill-command.mjs';
import {resolveScalarSkillField} from './skill-field.mjs';
import {inspectCommandSupport} from './inspect-command-support.mjs';
import {runActiveCommandExperiment} from './active-command-experiment.mjs';

// Connect selected exported skills to supported imported rows without dropping effects.
export function runPreparedSkillExperiment({preparation,commands,experiment,targetBinding,lifecycle}){
  if(!commands||!experiment||Object.hasOwn(experiment,'rows')||Object.hasOwn(experiment,'command')||!experiment.variables||lifecycle!=='assumed-absent')throw new Error('Explicit command catalog, experiment without rows and absent lifecycle assumption required');
  const prepared=prepareSkillCommand(preparation);
  if(!Object.hasOwn(commands,prepared.commandId))throw new Error('Selected command is missing');
  const targetSelection=resolveScalarSkillField({...preparation,field:'CmdTarget',evaluate:preparation.evaluateCondition});
  if(!targetBinding||targetBinding.expression!==targetSelection.value)throw new Error('Explicit binding of the selected skill target required');
  let targetResolution=null;
  if(targetBinding.resolution==='front-enemy-context'){
    if(targetSelection.value!=='FrontEnemy'||Object.keys(targetBinding).length!==4||!Number.isSafeInteger(targetBinding.targetUid))throw new Error('FrontEnemy context and target snapshot UID required');
    targetResolution=selectFrontEnemy(targetBinding.context);
    if(targetResolution.targets.length!==1||targetResolution.targets[0]!==targetBinding.targetUid)throw new Error('Selected target does not match supplied HP/modifier snapshot; no damage executed');
  }else if(targetBinding.resolution!=='supplied-single-UpperTarget'||Object.keys(targetBinding).length!==2)throw new Error('Explicit binding of the selected skill target to supplied UpperTarget required');
  const mixed=experiment.kind==='morimens-damage-energy-command';
  if(mixed&&experiment.energy?.source?.skillConfigId!==preparation.skill.ID)throw new Error('Energy source skill identity must match selected skill');
  const support=inspectCommandSupport({command:commands[prepared.commandId],allowedFunctions:mixed?[]:preparation.allowedFunctions??[],profile:mixed?'damage-and-energy':'ordinary-active-UpperTarget'});
  const dependencies=[...prepared.unresolvedDependencies,targetResolution?'FrontEnemy uses supplied camp, lock/taunt identities and role snapshots; no automatic registry derivation':'Skill target resolved externally; no automatic target selection','Skill arguments frozen at preparation; no intervening argument refresh','No costs, lifecycle, passive triggers, animation timing or gameplay validation'];
  const base={build:'pc-res144-build51',finalDamage:null,prepared,targetSelection,targetResolution,targetBinding:{...targetBinding},support,unresolvedDependencies:dependencies};
  if(!support.structurallyCompatible)return {...base,status:'UNSUPPORTED_COMMAND',calculation:null};
  for(const name of Object.keys(experiment.variables))if(/^Arg\d+$/.test(name))throw new Error('Command ArgN bindings must come from prepared skill arguments');
  const calculation=mixed?runDamageEnergyCommand({...experiment,command:commands[prepared.commandId],variables:{...experiment.variables,...prepared.argumentBindings}}):runActiveCommandExperiment({...experiment,rows:support.normalizedRows,variables:{...experiment.variables,...prepared.argumentBindings}},
    {allowedFunctions:preparation.allowedFunctions??[],callFunction:preparation.callFunction});
  return {...base,status:'EXPERIMENTAL',calculation,unresolvedDependencies:[...dependencies,...calculation.unresolvedDependencies]};
}
