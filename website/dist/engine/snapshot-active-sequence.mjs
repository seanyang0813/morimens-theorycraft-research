import {calculateSnapshotActiveDamage} from './battle-property-snapshot-damage.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const clone=value=>JSON.parse(JSON.stringify(value));
const hitKeys=['id','baseValue','skillArgsPlus','tags','cardProperties','cardContext','targetContext','hitContext'];

// Threads only the recovered HP and Block mutations between complete-property Active hits.
export function runSnapshotActiveSequence(value){
  const input=clone(value);
  const keys=['schemaVersion','kind','build','snapshotStage','snapshotCompleteness','interveningEffects','casterProperties','playerProperties','initialTargetProperties','hits'];
  if(!exact(input,keys)||input.schemaVersion!==1||input.kind!=='morimens-snapshot-active-sequence'||input.interveningEffects!=='assumed-absent'||input.snapshotCompleteness!=='complete-map'||!Array.isArray(input.hits)||input.hits.length===0)throw new Error('Explicit complete snapshot Active sequence required');
  const ids=new Set();
  for(const hit of input.hits){
    if(!exact(hit,hitKeys)||typeof hit.id!=='string'||!hit.id||ids.has(hit.id))throw new Error('Each snapshot hit requires a unique nonempty ID and exact fields');
    ids.add(hit.id);
  }
  const makeRequest=(hit,targetProperties)=>({schemaVersion:2,kind:'morimens-battle-property-snapshot-damage',build:input.build,snapshotStage:input.snapshotStage,snapshotCompleteness:input.snapshotCompleteness,baseValue:hit.baseValue,skillArgsPlus:hit.skillArgsPlus,tags:hit.tags,casterProperties:input.casterProperties,playerProperties:input.playerProperties,targetProperties,cardProperties:hit.cardProperties,cardContext:hit.cardContext,targetContext:hit.targetContext,hitContext:hit.hitContext});
  // Validate every supplied hit even when an earlier hit will end execution.
  for(const hit of input.hits)calculateSnapshotActiveDamage(makeRequest(hit,input.initialTargetProperties));
  const firstContext=input.hits[0].targetContext;
  for(const hit of input.hits)if(hit.targetContext.targetBattleTag!==firstContext.targetBattleTag||JSON.stringify(hit.targetContext.targetStateIds)!==JSON.stringify(firstContext.targetStateIds))throw new Error('Assumed-absent sequence requires stable target battle tag and state IDs');
  let targetProperties={...input.initialTargetProperties},stop=null;
  const trace=[];
  for(const hit of input.hits){
    if((targetProperties.hp??0)<=0){stop={beforeHitId:hit.id,reason:'Death handling required'};break;}
    const before={hp:targetProperties.hp??0,block:targetProperties.block??0};
    const result=calculateSnapshotActiveDamage(makeRequest(hit,targetProperties));
    targetProperties={...targetProperties,hp:result.hpResolution.hpAfter,block:result.hpResolution.blockAfter};
    trace.push({hitId:hit.id,before,result,after:{hp:targetProperties.hp,block:targetProperties.block}});
  }
  const hpBefore=input.initialTargetProperties.hp??0,hpAfter=targetProperties.hp??0;
  return {schemaVersion:1,kind:'morimens-snapshot-active-sequence-result',analysisTrack:'theorycrafting',status:'EXPERIMENTAL',build:input.build,finalDamage:null,completed:stop===null,stop,executedHits:trace.length,unexecutedHits:input.hits.length-trace.length,initialTarget:{hp:hpBefore,block:input.initialTargetProperties.block??0},targetAfter:{hp:hpAfter,block:targetProperties.block??0},modeledHpLost:hpBefore-hpAfter,trace,unresolvedDependencies:['Only HP and Block mutations are threaded automatically; state layers, property callbacks, trigger events, damage statistics, death execution and be_damage_statics updates are not simulated','Intervening effects are explicitly assumed absent; target battle tag and state IDs must stay constant','Every hit still has finalDamage null and inherits the bounded property-snapshot evidence scope']};
}
