import {calculateDamage} from './calculate-damage.mjs';
import {runCardActionTimeline} from './card-action-timeline.mjs';
import {runResearchTimeline} from './research-timeline.mjs';
import {runOrderedStateCommand} from './ordered-state-command.mjs';
import {validateBuildPlan} from './build-plan.mjs';
import {resolveClientBuildPrimary} from './client-build-stats.mjs';
import {resolveWheelMainstat} from './wheel-stats.mjs';

export const theorycraftOperations=Object.freeze([
  {name:'describe-capabilities',context:[],scope:'List supported versioned operations and evidence boundaries'},
  {name:'calculate-damage',context:[],scope:'Resolved single-hit Active, Passive, Fixed or Pure research calculation'},
  {name:'run-hit-timeline',context:[],scope:'Supplied resolved hit sequence with an explicit intervening-effect policy'},
  {name:'run-card-actions',context:[],scope:'Card payment plus supplied hit or supported numeric-command sequence'},
  {name:'run-ordered-state-command',context:[],scope:'Supported ordered state/resource/damage command rows'},
  {name:'validate-build-plan',context:['buildCatalog'],scope:'Catalog identity and shape validation; no automatic combat assembly'},
  {name:'resolve-character-primary',context:['clientBuildData'],scope:'Client-derived primary CON/ATK/DEF baseline'},
  {name:'resolve-wheel-mainstat',context:['buildCatalog'],scope:'Catalog-derived Wheel main-stat scaling'},
]);

const operations=new Map(theorycraftOperations.map(row=>[row.name,row]));
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const clone=value=>JSON.parse(JSON.stringify(value));

function execute(operation,input,context){
  if(operation==='describe-capabilities'){
    if(input!==null)throw new Error('describe-capabilities requires input: null');
    return {apiVersion:1,combatBuild:'pc-res144-build51',operations:clone(theorycraftOperations),labels:['CATALOG_DERIVED','PLAN_ONLY','EXPERIMENTAL','UNVERIFIED'],publicationStatus:'NOT_READY'};
  }
  if(operation==='calculate-damage')return calculateDamage(input);
  if(operation==='run-hit-timeline')return runResearchTimeline(input);
  if(operation==='run-card-actions')return runCardActionTimeline(input);
  if(operation==='run-ordered-state-command')return runOrderedStateCommand(input);
  if(operation==='validate-build-plan')return validateBuildPlan(input,context.buildCatalog);
  if(operation==='resolve-character-primary')return resolveClientBuildPrimary(input,context.clientBuildData);
  if(operation==='resolve-wheel-mainstat')return resolveWheelMainstat(input,context.buildCatalog);
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
  return {schemaVersion:1,kind:'morimens-theorycraft-response',requestId:value.requestId,operation:value.operation,status:'OK',result};
}

