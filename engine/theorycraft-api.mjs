import {calculateDamage} from './calculate-damage.mjs';
import {runCardActionTimeline} from './card-action-timeline.mjs';
import {runResearchTimeline} from './research-timeline.mjs';
import {runOrderedStateCommand} from './ordered-state-command.mjs';
import {validateBuildPlan} from './build-plan.mjs';
import {resolveClientBuildPrimary,resolveClientAdvancementPrimary} from './client-build-stats.mjs';
import {resolveWheelMainstat} from './wheel-stats.mjs';
import {assembleKnownBuildComponents} from './build-component-assembly.mjs';
import {searchCardOrders} from './card-order-search.mjs';
import {runPreparedSkillRequest} from './prepared-skill-request.mjs';
import {applyMonsterSkillChange} from './monster-skill-change.mjs';
import {runRoleStateCommand} from './role-state-command.mjs';
import {enumerateLegalCardActions} from './legal-card-actions.mjs';
import {runCommandDamagePrefix} from './command-damage-prefix.mjs';
import {runAttachedCardPipeline} from './attached-card-pipeline.mjs';
import {runConditionalRoleStateSuffix} from './conditional-role-state-suffix.mjs';
import {calculateSnapshotActiveDamage} from './battle-property-snapshot-damage.mjs';

export const theorycraftOperations=Object.freeze([
  {name:'describe-capabilities',context:[],scope:'List supported versioned operations and evidence boundaries'},
  {name:'calculate-damage',context:[],scope:'Resolved single-hit Active, Passive, Fixed or Pure research calculation'},
  {name:'calculate-snapshot-active-damage',context:[],scope:'Complete captured battle-property maps through the bounded PvE Active path'},
  {name:'run-hit-timeline',context:[],scope:'Supplied resolved hit sequence with an explicit intervening-effect policy'},
  {name:'run-card-actions',context:[],scope:'Card payment plus supplied hit or supported numeric-command sequence'},
  {name:'run-ordered-state-command',context:[],scope:'Supported ordered state/resource/damage command rows'},
  {name:'validate-build-plan',context:['buildCatalog'],scope:'Catalog identity and shape validation; no automatic combat assembly'},
  {name:'resolve-character-primary',context:['clientBuildData'],scope:'Client-derived primary CON/ATK/DEF baseline'},
  {name:'resolve-character-advancement-primary',context:['clientBuildData'],scope:'Client-derived primary stats plus explicit Season/Soulforge percentage promotion'},
  {name:'resolve-wheel-mainstat',context:['buildCatalog'],scope:'Catalog-derived Wheel main-stat scaling'},
  {name:'assemble-build-components',context:['buildCatalog','clientBuildData'],scope:'Known character primary-stat and Wheel-main-stat contribution ledger'},
  {name:'search-card-orders',context:[],scope:'Exact bounded permutation search over supplied resolved card actions'},
  {name:'prepare-skill-command',context:['skillCommandData'],scope:'Exported skill selection, argument preparation and optional supported command execution'},
  {name:'apply-monster-skill-change',context:[],scope:'Original-runtime-matched monster intent replacement/queue mutation without executing the selected skill'},
  {name:'run-role-state-command',context:[],scope:'Setup-only state and presentation rows over explicit role/property snapshots'},
  {name:'enumerate-legal-card-actions',context:[],scope:'Ordinary PvE card dispatch, status and affordability enumeration from explicit state'},
  {name:'run-command-damage-prefix',context:[],scope:'Leading ordinary Active-damage rows until the first unsupported command row'},
  {name:'run-attached-card-pipeline',context:['skillCommandData'],scope:'Attach request, temporary-card construction, catalog command resolution and optional leading damage prefix'},
  {name:'run-conditional-role-state-suffix',context:[],scope:'Conditional state-only command suffix over explicit role and query snapshots'},
]);

export const theorycraftClaimBoundary=Object.freeze({
  purpose:'Evaluate explicit builds and sequences with reconstructed rules',
  mayClaim:['model result within the supplied inputs and supported rule scope'],
  mustNotClaim:['observed cheese','leaderboard prevalence','independent gameplay verification'],
  crossTrackUse:'May consume cited mechanics from other tracks; every unsupported branch and supplied input remains explicit',
});

const operations=new Map(theorycraftOperations.map(row=>[row.name,row]));
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const clone=value=>JSON.parse(JSON.stringify(value));

function execute(operation,input,context){
  if(operation==='describe-capabilities'){
    if(input!==null)throw new Error('describe-capabilities requires input: null');
    return {apiVersion:1,supportedCombatBuilds:['pc-res144-build51','pc-res150-build51'],operations:clone(theorycraftOperations),labels:['CATALOG_DERIVED','PLAN_ONLY','EXPERIMENTAL','UNVERIFIED'],publicationStatus:'NOT_READY'};
  }
  if(operation==='calculate-damage')return calculateDamage(input);
  if(operation==='calculate-snapshot-active-damage')return calculateSnapshotActiveDamage(input);
  if(operation==='run-hit-timeline')return runResearchTimeline(input);
  if(operation==='run-card-actions')return runCardActionTimeline(input);
  if(operation==='run-ordered-state-command')return runOrderedStateCommand(input);
  if(operation==='validate-build-plan')return validateBuildPlan(input,context.buildCatalog);
  if(operation==='resolve-character-primary')return resolveClientBuildPrimary(input,context.clientBuildData);
  if(operation==='resolve-character-advancement-primary')return resolveClientAdvancementPrimary(input,context.clientBuildData);
  if(operation==='resolve-wheel-mainstat')return resolveWheelMainstat(input,context.buildCatalog);
  if(operation==='assemble-build-components')return assembleKnownBuildComponents(input,context.buildCatalog,context.clientBuildData);
  if(operation==='search-card-orders')return searchCardOrders(input);
  if(operation==='prepare-skill-command')return runPreparedSkillRequest(input,context.skillCommandData);
  if(operation==='apply-monster-skill-change'){
    if(!exact(input,['state','skillId','changeType']))throw new Error('Exact monster skill-change input required');
    return applyMonsterSkillChange(input.state,input.skillId,input.changeType);
  }
  if(operation==='run-role-state-command')return runRoleStateCommand(input);
  if(operation==='enumerate-legal-card-actions')return enumerateLegalCardActions(input);
  if(operation==='run-command-damage-prefix')return runCommandDamagePrefix(input);
  if(operation==='run-attached-card-pipeline'){
    const data=context.skillCommandData;
    return runAttachedCardPipeline(input,{build:input.build,skills:data.skills,battleApi:data.battleApi,commands:data.commands,sourceHashes:{Skill:data.sourceHashes.Skill,BattleApi:data.sourceHashes.BattleApi,Cmd:data.sourceHashes.Cmd}});
  }
  if(operation==='run-conditional-role-state-suffix')return runConditionalRoleStateSuffix(input);
  throw new Error('Unsupported theorycraft operation');
}

// Stable serializable boundary for both browser callers and local agents.
export function runTheorycraftRequest(value,context={}){
  const allowed=['schemaVersion','kind','requestId','operation','input'];
  if(!value||Object.keys(value).some(key=>!allowed.includes(key))||!exact(value,allowed)||value.schemaVersion!==1||value.kind!=='morimens-theorycraft-request')throw new Error('Expected an exact version 1 theorycraft request');
  if(typeof value.requestId!=='string'||!value.requestId||value.requestId.length>128)throw new Error('Nonempty requestId up to 128 characters required');
  if(!operations.has(value.operation))throw new Error('Unsupported theorycraft operation');
  const requirement=operations.get(value.operation);
  for(const key of requirement.context)if(!context[key])throw new Error(`Operation ${value.operation} requires context ${key}`);
  const result=execute(value.operation,clone(value.input),context);
  return {schemaVersion:1,kind:'morimens-theorycraft-response',analysisTrack:'theorycrafting',claimBoundary:clone(theorycraftClaimBoundary),requestId:value.requestId,operation:value.operation,status:'OK',result};
}
