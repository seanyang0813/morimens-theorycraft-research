import {runPreparedSnapshotActiveSkill} from './prepared-snapshot-active-skill.mjs';
import {runPaidWheelActiveTimeline} from './paid-wheel-active-timeline.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const clone=value=>JSON.parse(JSON.stringify(value));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const supportedBuilds=new Set(['pc-res144-build51','pc-res150-build51']);

// Derives each card's Active hits from pinned Skill/BattleApi/Cmd data before
// joining explicit payment, per-caster snapshots and supported Wheel events.
export function runPreparedPaidWheelActiveTimeline(value,source){
  const input=clone(value),keys=['schemaVersion','kind','build','initialEnergy','wheelContributionPolicy','initialWheelContributions','actions'];
  if(!exact(input,keys)||input.schemaVersion!==1||input.kind!=='morimens-prepared-paid-wheel-active-timeline'||!supportedBuilds.has(input.build)||input.wheelContributionPolicy!=='excluded-from-prepared-snapshots'||!Array.isArray(input.actions)||input.actions.length===0)throw new Error('Exact supported prepared paid Wheel timeline required');
  const preparedActions=[],derivedActions=[];let snapshotBaseline=null,targetTag=null,targetStateIds=null;
  for(const action of input.actions){
    if(!exact(action,['id','cardInstanceId','costInput','conditions','preparedSkill','postEvents'])||typeof action.id!=='string'||!action.id||typeof action.cardInstanceId!=='string'||!action.cardInstanceId||action.preparedSkill?.schemaVersion!==1||action.preparedSkill?.kind!=='morimens-prepared-snapshot-active-skill'||action.preparedSkill?.build!==input.build||!Array.isArray(action.postEvents)||action.postEvents.some(event=>!exact(event,['id','type','pursuitOwnerUid'])||event.type!=='AFTER_PURSUIT'))throw new Error('Each prepared paid Wheel action requires one supported catalog Active skill and explicit post-pursuit events');
    const prepared=runPreparedSnapshotActiveSkill(action.preparedSkill,source);
    const cardType=prepared.tags.includes('Card_Strike')?'Card_Strike':prepared.tags.includes('Card_Skill')?'Card_Skill':null;
    if(cardType===null||action.conditions?.strike!==(cardType==='Card_Strike'))throw new Error('Prepared card type and supplied Strike condition must agree');
    const snapshot=action.preparedSkill.snapshot;
    if(snapshotBaseline===null){snapshotBaseline=clone(snapshot.initialTargetProperties);targetTag=snapshot.targetBattleTag;targetStateIds=clone(snapshot.targetStateIds);}
    else if(!same(snapshot.initialTargetProperties,snapshotBaseline)||snapshot.targetBattleTag!==targetTag||!same(snapshot.targetStateIds,targetStateIds))throw new Error('Every prepared action must declare the same pre-sequence target snapshot and target context');
    const effects=prepared.derivedSequenceInput.hits.map(hit=>({id:`${action.id}:${hit.id}`,type:'ACTIVE_HIT',baseValue:hit.baseValue,skillArgsPlus:hit.skillArgsPlus,tags:hit.tags,casterProperties:clone(snapshot.casterProperties),playerProperties:clone(snapshot.playerProperties),cardProperties:hit.cardProperties,cardContext:hit.cardContext,targetContext:hit.targetContext,hitContext:hit.hitContext}));
    effects.push(...clone(action.postEvents));
    derivedActions.push({id:action.id,cardInstanceId:action.cardInstanceId,cardType,costInput:action.costInput,conditions:action.conditions,effects});
    preparedActions.push({id:action.id,cardInstanceId:action.cardInstanceId,skillId:prepared.skillId,commandId:prepared.prepared.commandId,sourceHashes:prepared.sourceHashes,catalogTypes:prepared.catalogTypes,tags:prepared.tags,cardType,derivedHitIds:effects.filter(effect=>effect.type==='ACTIVE_HIT').map(effect=>effect.id),postEventIds:action.postEvents.map(event=>event.id),preparation:prepared});
  }
  const first=input.actions[0].preparedSkill.snapshot;
  const derivedTimelineInput={schemaVersion:2,kind:'morimens-paid-wheel-active-timeline',build:input.build,initialEnergy:input.initialEnergy,snapshotStage:first.snapshotStage,snapshotCompleteness:first.snapshotCompleteness,initialWheelContributions:input.initialWheelContributions,initialTargetProperties:snapshotBaseline,actions:derivedActions};
  const calculation=runPaidWheelActiveTimeline(derivedTimelineInput);
  return {schemaVersion:1,kind:'morimens-prepared-paid-wheel-active-timeline-result',analysisTrack:'theorycrafting',status:'EXPERIMENTAL_COMPOSITION',build:input.build,finalDamage:null,sourceHashes:clone(source.sourceHashes),wheelContributionPolicy:input.wheelContributionPolicy,preparedActions,derivedTimelineInput,calculation,modeledHpLost:calculation.modeledHpLost,energyAfter:calculation.energyAfter,completed:calculation.completed,stop:calculation.stop,unresolvedDependencies:['Active hit count, parameters, tags and card context derive from pinned catalog Skill/BattleApi/Cmd rows; complete property snapshots and runtime variables remain supplied evidence','Only schema 1 prepared Active skills with no modeled energy/state suffix are accepted; each action must retain one common target baseline and context','Shared Wheel contributions must be excluded from supplied prepared snapshots and are added by the derived schema 2 timeline','Post-pursuit events remain explicit because pursuit generation is not inferred from the prepared Active command','Hand mutation, draws, refunds, changing costs/conditions, other triggers, death execution and gameplay validation remain unresolved']};
}
