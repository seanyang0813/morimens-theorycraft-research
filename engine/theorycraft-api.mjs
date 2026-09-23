import {calculateDamage} from './calculate-damage.mjs';
import {playerTentacleDamage} from './player-tentacle-damage.mjs';
import {tentacleCritDamage} from './tentacle-crit-damage.mjs';
import {runCardActionTimeline} from './card-action-timeline.mjs';
import {runResearchTimeline} from './research-timeline.mjs';
import {runOrderedStateCommand} from './ordered-state-command.mjs';
import {validateBuildPlan} from './build-plan.mjs';
import {resolveClientBuildPrimary,resolveClientAdvancementPrimary} from './client-build-stats.mjs';
import {resolveWheelMainstat} from './wheel-stats.mjs';
import {searchWheelCatalog} from './wheel-search.mjs';
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
import {runSnapshotActiveSequence} from './snapshot-active-sequence.mjs';
import {runPreparedSnapshotActiveSkill} from './prepared-snapshot-active-skill.mjs';
import {runUltiEnergyExperiment} from './ulti-energy-experiment.mjs';
import {runPreparedSnapshotBlockSkill} from './prepared-snapshot-block-skill.mjs';
import {runPreparedStateActiveSequence} from './prepared-state-active-sequence.mjs';
import {runPreparedStateActiveChain} from './prepared-state-active-chain.mjs';
import {runPaidPreparedStateActiveChain} from './paid-prepared-state-active-chain.mjs';
import {assembleWheelLoadoutProperties} from './wheel-loadout-properties.mjs';
import {advanceDoomsdayAfterUseCard,advanceLightOfIntellectAfterKeeperSkill,advanceArachneAfterPursuit} from './wheel-trigger-transitions.mjs';
import {runWheelEventSequence} from './wheel-event-sequence.mjs';
import {runWheelActiveTimeline} from './wheel-active-timeline.mjs';
import {compareWheelActiveTimelines} from './wheel-active-comparison.mjs';
import {runPaidWheelActiveTimeline} from './paid-wheel-active-timeline.mjs';
import {searchPaidWheelOrders} from './paid-wheel-order-search.mjs';
import {runPreparedPaidWheelActiveTimeline} from './prepared-paid-wheel-active-timeline.mjs';
import {selectCopyHistoryCards} from './copy-history-card-selection.mjs';
import {runMortalBlastCopySuffix} from './mortal-blast-copy-suffix.mjs';
import {runPreparedMortalBlast} from './prepared-mortal-blast.mjs';

export const theorycraftOperations=Object.freeze([
  {name:'describe-capabilities',context:[],scope:'List supported versioned operations and evidence boundaries'},
  {name:'calculate-damage',context:[],scope:'Resolved single-hit research calculation; resource-150 supports Fixed/Pure pre-hit, and resource-151 supports Fixed/Pure/Tentacle pre-hit'},
  {name:'calculate-player-tentacle-damage',context:[],scope:'Installed resource-151 PvE Player Tentacle value from explicit Player/Awakener properties, before card/effect/target calculation'},
  {name:'calculate-tentacle-crit-damage',context:[],scope:'Installed resource-151 conditional Tentacle Crit DMG bonus from explicit region and Player/Awakener properties'},
  {name:'calculate-snapshot-active-damage',context:[],scope:'Complete captured battle-property maps through bounded PvE Active pre-hit and optional BeHit-to-HP paths'},
  {name:'run-snapshot-active-sequence',context:[],scope:'Repeated complete-property Active hits with recovered HP and Block mutations threaded between hits'},
  {name:'run-prepared-snapshot-active-skill',context:['skillCommandData'],scope:'Catalog-prepared ordinary/Puncture Active rows through complete-property hits, including a fail-closed leading-damage prefix for mixed commands'},
  {name:'run-prepared-snapshot-block-skill',context:['skillCommandData'],scope:'Catalog-prepared ordinary PvE Defend Block gain and capped caster ultimate-energy gain from complete property snapshots'},
  {name:'run-prepared-state-active-sequence',context:['skillCommandData'],scope:'Catalog-backed role-state card followed by a prepared Active skill with explicit live-property and caster-state handoff'},
  {name:'run-prepared-state-active-chain',context:['skillCommandData'],scope:'Catalog-backed role-state card followed by ordered prepared Active skills with HP, Block and exposed caster-energy carry'},
  {name:'run-paid-prepared-state-active-chain',context:['skillCommandData'],scope:'Ordinary PvE legality and energy payment before a catalog-backed state card and ordered prepared Active cards'},
  {name:'run-ulti-energy-effect',context:[],scope:'Ordinary ultimate-energy calculation, repetition and capped Awakener storage for resource 144 or 150'},
  {name:'run-hit-timeline',context:[],scope:'Supplied resolved hit sequence with an explicit intervening-effect policy'},
  {name:'run-card-actions',context:[],scope:'Card payment plus supplied hit or supported numeric-command sequence'},
  {name:'run-ordered-state-command',context:[],scope:'Supported ordered state/resource/damage command rows'},
  {name:'validate-build-plan',context:['buildCatalog'],scope:'Catalog identity and shape validation; no automatic combat assembly'},
  {name:'resolve-character-primary',context:['clientBuildData'],scope:'Client-derived primary CON/ATK/DEF baseline'},
  {name:'resolve-character-advancement-primary',context:['clientBuildData'],scope:'Client-derived primary stats plus explicit Season/Soulforge percentage promotion'},
  {name:'resolve-wheel-mainstat',context:['buildCatalog'],scope:'Catalog-derived Wheel main-stat scaling'},
  {name:'search-wheel-catalog',context:['buildCatalog'],scope:'Catalog Wheel discovery by name, associated owner, realm, main stat and normalized mechanic tags; no passive execution or ranking'},
  {name:'assemble-build-components',context:['buildCatalog','clientBuildData'],scope:'Known character primary-stat and Wheel-main-stat contribution ledger'},
  {name:'assemble-wheel-loadout-properties',context:['buildCatalog','wheelMechanicsData'],scope:'Two-slot Wheel refinement and initial direct-property contribution ledger; trigger effects remain unresolved'},
  {name:'advance-after-use-card-wheel-trigger',context:[],scope:'Source-derived Doomsday post-card Strike-flat transition with explicit pre-event state'},
  {name:'advance-after-keeper-skill-wheel-trigger',context:[],scope:'Source-derived Light of Intellect once-per-turn Strike retrieval request'},
  {name:'advance-after-pursuit-wheel-triggers',context:[],scope:'Source-derived Arachne two-Wheel pursuit-amplification transition with owner and cap checks'},
  {name:'run-wheel-event-sequence',context:[],scope:'Ordered supported Wheel events with explicit temporary contributions and source-derived lifecycle clearing'},
  {name:'run-wheel-active-timeline',context:[],scope:'Explicit supported Wheel events composed with complete-property Active hits and shared HP/Block state'},
  {name:'compare-wheel-active-timelines',context:[],scope:'Align two explicit Wheel/damage timelines by stable step identity and report order, input, damage, property and counter differences'},
  {name:'run-paid-wheel-active-timeline',context:[],scope:'Ordinary PvE play checks and energy payment before explicit Wheel-aware Active card effects and accepted-card Doomsday transitions'},
  {name:'run-prepared-paid-wheel-active-timeline',context:['skillCommandData'],scope:'Pinned catalog Active commands derived into paid multi-caster Wheel actions with explicit snapshots and pursuit events'},
  {name:'search-paid-wheel-orders',context:[],scope:'Exact bounded permutation search over supplied paid Wheel-aware actions with legal terminal filtering and full winning trace'},
  {name:'search-card-orders',context:[],scope:'Exact bounded permutation search over supplied resolved card actions'},
  {name:'prepare-skill-command',context:['skillCommandData'],scope:'Exported skill selection, argument preparation and optional supported command execution'},
  {name:'apply-monster-skill-change',context:[],scope:'Original-runtime-matched monster intent replacement/queue mutation without executing the selected skill'},
  {name:'run-role-state-command',context:[],scope:'Setup-only state and presentation rows over explicit role/property snapshots'},
  {name:'enumerate-legal-card-actions',context:[],scope:'Ordinary PvE card dispatch, status and affordability enumeration from explicit state'},
  {name:'run-command-damage-prefix',context:[],scope:'Leading ordinary Active-damage rows until the first unsupported command row'},
  {name:'run-attached-card-pipeline',context:['skillCommandData'],scope:'Attach request, temporary-card construction, catalog command resolution and optional leading damage prefix'},
  {name:'run-conditional-role-state-suffix',context:[],scope:'Conditional state-only command suffix over explicit role and query snapshots'},
  {name:'select-copy-history-cards',context:[],scope:'Original-runtime-matched newest-first history selection with type, duplicate and excluded-state filters'},
  {name:'run-mortal-blast-copy-suffix',context:[],scope:'Mortal Blast history selection, top-of-hand creation, LastTarget handoff and three proven Card-state properties after a proven potency branch'},
  {name:'run-prepared-mortal-blast',context:['skillCommandData'],scope:'Catalog-derived Mortal Blast direct hits joined to its proven copy suffix; generated Strike play remains unresolved'},
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
    return {apiVersion:1,supportedCombatBuilds:['pc-res144-build51','pc-res150-build51','pc-res151-build51'],resource151OperationScope:['calculate-damage','calculate-player-tentacle-damage','calculate-tentacle-crit-damage','calculate-snapshot-active-damage','run-snapshot-active-sequence','prepare-skill-command','run-prepared-snapshot-active-skill','run-ulti-energy-effect','run-card-resource-timeline','run-prepared-snapshot-block-skill','run-prepared-state-active-sequence','run-prepared-state-active-chain','run-paid-prepared-state-active-chain','validate-build-plan','resolve-character-primary','resolve-character-advancement-primary','assemble-build-components','advance-after-use-card-wheel-trigger','advance-after-keeper-skill-wheel-trigger','advance-after-pursuit-wheel-triggers','run-wheel-event-sequence','run-wheel-active-timeline','compare-wheel-active-timelines','run-paid-wheel-active-timeline','run-prepared-paid-wheel-active-timeline','search-paid-wheel-orders'],operations:clone(theorycraftOperations),labels:['CATALOG_DERIVED','PLAN_ONLY','EXPERIMENTAL','UNVERIFIED'],publicationStatus:'NOT_READY'};
  }
  if(operation==='calculate-damage')return calculateDamage(input);
  if(operation==='calculate-player-tentacle-damage')return playerTentacleDamage(input);
  if(operation==='calculate-tentacle-crit-damage')return tentacleCritDamage(input);
  if(operation==='calculate-snapshot-active-damage')return calculateSnapshotActiveDamage(input);
  if(operation==='run-snapshot-active-sequence')return runSnapshotActiveSequence(input);
  if(operation==='run-prepared-snapshot-active-skill')return runPreparedSnapshotActiveSkill(input,context.skillCommandData);
  if(operation==='run-prepared-snapshot-block-skill')return runPreparedSnapshotBlockSkill(input,context.skillCommandData);
  if(operation==='run-prepared-state-active-sequence')return runPreparedStateActiveSequence(input,context.skillCommandData);
  if(operation==='run-prepared-state-active-chain')return runPreparedStateActiveChain(input,context.skillCommandData);
  if(operation==='run-paid-prepared-state-active-chain')return runPaidPreparedStateActiveChain(input,context.skillCommandData);
  if(operation==='run-ulti-energy-effect')return runUltiEnergyExperiment(input);
  if(operation==='run-hit-timeline')return runResearchTimeline(input);
  if(operation==='run-card-actions')return runCardActionTimeline(input);
  if(operation==='run-ordered-state-command')return runOrderedStateCommand(input);
  if(operation==='validate-build-plan')return validateBuildPlan(input,context.buildCatalog);
  if(operation==='resolve-character-primary')return resolveClientBuildPrimary(input,context.clientBuildData);
  if(operation==='resolve-character-advancement-primary')return resolveClientAdvancementPrimary(input,context.clientBuildData);
  if(operation==='resolve-wheel-mainstat')return resolveWheelMainstat(input,context.buildCatalog);
  if(operation==='search-wheel-catalog')return searchWheelCatalog(input,context.buildCatalog);
  if(operation==='assemble-build-components')return assembleKnownBuildComponents(input,context.buildCatalog,context.clientBuildData,context.wheelCurrentCompatibility);
  if(operation==='assemble-wheel-loadout-properties')return assembleWheelLoadoutProperties(input,context.buildCatalog,context.wheelMechanicsData);
  if(operation==='advance-after-use-card-wheel-trigger')return advanceDoomsdayAfterUseCard(input);
  if(operation==='advance-after-keeper-skill-wheel-trigger')return advanceLightOfIntellectAfterKeeperSkill(input);
  if(operation==='advance-after-pursuit-wheel-triggers')return advanceArachneAfterPursuit(input);
  if(operation==='run-wheel-event-sequence')return runWheelEventSequence(input);
  if(operation==='run-wheel-active-timeline')return runWheelActiveTimeline(input);
  if(operation==='compare-wheel-active-timelines')return compareWheelActiveTimelines(input);
  if(operation==='run-paid-wheel-active-timeline')return runPaidWheelActiveTimeline(input);
  if(operation==='run-prepared-paid-wheel-active-timeline')return runPreparedPaidWheelActiveTimeline(input,context.skillCommandData);
  if(operation==='search-paid-wheel-orders')return searchPaidWheelOrders(input);
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
  if(operation==='select-copy-history-cards')return selectCopyHistoryCards(input);
  if(operation==='run-mortal-blast-copy-suffix')return runMortalBlastCopySuffix(input);
  if(operation==='run-prepared-mortal-blast')return runPreparedMortalBlast(input,context.skillCommandData);
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
