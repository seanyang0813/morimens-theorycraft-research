import {calculateSnapshotActiveDamage} from './battle-property-snapshot-damage.mjs';
import {runWheelEventSequence} from './wheel-event-sequence.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const clone=value=>JSON.parse(JSON.stringify(value));
const hitKeys=['id','type','baseValue','skillArgsPlus','tags','cardProperties','cardContext','targetContext','hitContext'];
const eventKeys={AFTER_USE_CARD:['id','type','cardType'],AFTER_KEEPER_SKILL:['id','type','roll','matchingStrikeAvailable'],AFTER_PURSUIT:['id','type','pursuitOwnerUid'],AFTER_BOUT_END:['id','type'],BEFORE_BATTLE_END:['id','type']};

function privateWheelState(value){
  return {
    doomsday:value.doomsday===null?null:{refinementLevel:value.doomsday.refinementLevel,ownerAttack:value.doomsday.ownerAttack,counter:value.doomsday.counter,baseStrikecardDamagePlus:value.doomsday.baseStrikecardDamagePlus,wheelStrikecardDamagePlus:value.doomsday.wheelStrikecardDamagePlus},
    light:value.light===null?null:{refinementLevel:value.light.refinementLevel,counter:value.light.counter},
    arachne:value.arachne===null?null:{ownerUid:value.arachne.ownerUid,baseBasicDamagePer:value.arachne.baseBasicDamagePer,wheelBasicDamagePer:value.arachne.wheelBasicDamagePer,wheels:value.arachne.wheels.map(wheel=>({...wheel}))},
  };
}

function publicWheelState(value){
  const copy=clone(value);
  if(copy.doomsday)copy.doomsday.strikecardDamagePlus=copy.doomsday.baseStrikecardDamagePlus+copy.doomsday.wheelStrikecardDamagePlus;
  if(copy.arachne)copy.arachne.basicDamagePer=copy.arachne.baseBasicDamagePer+copy.arachne.wheelBasicDamagePer;
  return copy;
}

function property(map,name){return Object.hasOwn(map,name)?map[name]:0;}

function appliedProperties(wheelState){
  return {
    strikecardDamagePlus:wheelState.doomsday?wheelState.doomsday.baseStrikecardDamagePlus+wheelState.doomsday.wheelStrikecardDamagePlus:null,
    basicDamagePer:wheelState.arachne?wheelState.arachne.baseBasicDamagePer+wheelState.arachne.wheelBasicDamagePer:null,
  };
}

function damageRequest(input,step,wheelState,targetProperties){
  const applied=appliedProperties(wheelState);
  const casterProperties={...input.baseCasterProperties};
  const playerProperties={...input.basePlayerProperties};
  if(applied.strikecardDamagePlus!==null)casterProperties.strikecard_damage_plus=applied.strikecardDamagePlus;
  if(applied.basicDamagePer!==null)playerProperties.basic_damage_per=applied.basicDamagePer;
  return {schemaVersion:2,kind:'morimens-battle-property-snapshot-damage',build:input.build,snapshotStage:input.snapshotStage,snapshotCompleteness:input.snapshotCompleteness,baseValue:step.baseValue,skillArgsPlus:step.skillArgsPlus,tags:step.tags,casterProperties,playerProperties,targetProperties,cardProperties:step.cardProperties,cardContext:step.cardContext,targetContext:step.targetContext,hitContext:step.hitContext};
}

// Composes only explicitly ordered, already recovered Wheel events with the bounded
// complete-property Active hit adapter. It never infers which event a card emits.
export function runWheelActiveTimeline(value){
  const input=clone(value),keys=['schemaVersion','kind','build','snapshotStage','snapshotCompleteness','initialWheelState','baseCasterProperties','basePlayerProperties','initialTargetProperties','steps'];
  if(!exact(input,keys)||input.schemaVersion!==1||input.kind!=='morimens-wheel-active-timeline'||input.build!=='pc-res144-build51'||input.snapshotStage!=='battle-property-server-live'||input.snapshotCompleteness!=='complete-map'||!Array.isArray(input.steps)||input.steps.length===0)throw new Error('Exact resource-144 live-property Wheel Active timeline required');
  // Reuse the Wheel sequence validator even when the timeline contains no event.
  runWheelEventSequence({schemaVersion:1,kind:'morimens-wheel-event-sequence',build:input.build,initialState:input.initialWheelState,steps:[]});
  for(const [label,map] of [['baseCasterProperties',input.baseCasterProperties],['basePlayerProperties',input.basePlayerProperties],['initialTargetProperties',input.initialTargetProperties]])if(!map||Array.isArray(map)||Object.getPrototypeOf(map)!==Object.prototype||Object.values(map).some(item=>!Number.isFinite(item)))throw new Error(`${label} must be a finite numeric property map`);
  if(input.initialWheelState.doomsday&&property(input.baseCasterProperties,'strikecard_damage_plus')!==input.initialWheelState.doomsday.baseStrikecardDamagePlus)throw new Error('Base caster Strike flat must match the Wheel baseline');
  if(input.initialWheelState.arachne&&property(input.basePlayerProperties,'basic_damage_per')!==input.initialWheelState.arachne.baseBasicDamagePer)throw new Error('Base player amplification must match the Wheel baseline');
  const ids=new Set();
  for(const step of input.steps){
    if(!step||typeof step.id!=='string'||!step.id||ids.has(step.id)||typeof step.type!=='string')throw new Error('Timeline steps require unique IDs and explicit types');ids.add(step.id);
    if(step.type==='ACTIVE_HIT'){
      if(!exact(step,hitKeys))throw new Error('ACTIVE_HIT requires exact fields');
      calculateSnapshotActiveDamage(damageRequest(input,step,privateWheelState(input.initialWheelState),input.initialTargetProperties));
    }else{
      const allowed=eventKeys[step.type];if(!allowed||!exact(step,allowed))throw new Error('Unsupported or inexact Wheel timeline event');
      runWheelEventSequence({schemaVersion:1,kind:'morimens-wheel-event-sequence',build:input.build,initialState:input.initialWheelState,steps:[step]});
    }
  }
  let wheelState=privateWheelState(input.initialWheelState),targetProperties={...input.initialTargetProperties},stop=null,modeledHpLost=0;
  const trace=[];
  for(const step of input.steps){
    if((targetProperties.hp??0)<=0){stop={beforeStepId:step.id,reason:'Death handling required'};break;}
    if(step.type==='ACTIVE_HIT'){
      const before={wheelState:publicWheelState(wheelState),target:{hp:targetProperties.hp??0,block:targetProperties.block??0}},applied=appliedProperties(wheelState);
      const result=calculateSnapshotActiveDamage(damageRequest(input,step,wheelState,targetProperties));
      targetProperties={...targetProperties,hp:result.hpResolution.hpAfter,block:result.hpResolution.blockAfter};modeledHpLost+=result.modeledHpLost;
      trace.push({id:step.id,type:step.type,before,appliedWheelProperties:applied,result,after:{wheelState:publicWheelState(wheelState),target:{hp:targetProperties.hp,block:targetProperties.block}}});
    }else{
      const sequence=runWheelEventSequence({schemaVersion:1,kind:'morimens-wheel-event-sequence',build:input.build,initialState:wheelState,steps:[step]});
      trace.push({id:step.id,type:step.type,before:{wheelState:sequence.initialState,target:{hp:targetProperties.hp??0,block:targetProperties.block??0}},result:sequence.trace[0].result,after:{wheelState:sequence.finalState,target:{hp:targetProperties.hp??0,block:targetProperties.block??0}}});
      wheelState=privateWheelState(sequence.finalState);
    }
  }
  return {schemaVersion:1,kind:'morimens-wheel-active-timeline-result',analysisTrack:'theorycrafting',status:'EXPERIMENTAL_COMPOSITION',build:input.build,finalDamage:null,completed:stop===null,stop,executedSteps:trace.length,unexecutedSteps:input.steps.length-trace.length,modeledHpLost,targetAfter:{hp:targetProperties.hp??0,block:targetProperties.block??0},finalWheelState:publicWheelState(wheelState),trace,unresolvedDependencies:['Events must be ordered explicitly: an AFTER_USE_CARD step occurs after that card damage, and an AFTER_PURSUIT step occurs after that pursuit damage','Only recovered Doomsday Rampage, Light of Intellect, Eternal Weave and Rota Fortunae transitions are composed','Only Wheel-derived strikecard_damage_plus and basic_damage_per are injected into complete supplied property maps; all other properties remain caller evidence','Card legality, payment, automatic pursuit creation, deck mutation, other listeners, callbacks, death execution and gameplay validation remain unresolved']};
}
