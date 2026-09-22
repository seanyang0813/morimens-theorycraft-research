import {calculateSnapshotActiveDamage} from './battle-property-snapshot-damage.mjs';
import {runWheelEventSequence} from './wheel-event-sequence.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const clone=value=>JSON.parse(JSON.stringify(value));
const supportedBuilds=new Set(['pc-res144-build51','pc-res150-build51','pc-res151-build51']);
const hitKeys=['id','type','baseValue','skillArgsPlus','tags','cardProperties','cardContext','targetContext','hitContext'];
const multiHitKeys=[...hitKeys,'casterProperties','playerProperties'];
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

function contributionInputState(value){
  if(!exact(value,['doomsday','light','arachne']))throw new Error('Exact Wheel contribution state required');
  if(value.doomsday!==null&&!exact(value.doomsday,['refinementLevel','ownerAttack','counter','strikecardDamagePlus']))throw new Error('Exact Doomsday contribution state required');
  if(value.light!==null&&!exact(value.light,['refinementLevel','counter']))throw new Error('Exact Light contribution state required');
  if(value.arachne!==null&&(!exact(value.arachne,['ownerUid','basicDamagePer','wheels'])||!Array.isArray(value.arachne.wheels)))throw new Error('Exact Arachne contribution state required');
  return {
    doomsday:value.doomsday===null?null:{refinementLevel:value.doomsday.refinementLevel,ownerAttack:value.doomsday.ownerAttack,counter:value.doomsday.counter,baseStrikecardDamagePlus:0,wheelStrikecardDamagePlus:value.doomsday.strikecardDamagePlus},
    light:value.light===null?null:{...value.light},
    arachne:value.arachne===null?null:{ownerUid:value.arachne.ownerUid,baseBasicDamagePer:0,wheelBasicDamagePer:value.arachne.basicDamagePer,wheels:value.arachne.wheels.map(wheel=>({...wheel}))},
  };
}

function contributionWheelState(value){
  return {
    doomsday:value.doomsday===null?null:{refinementLevel:value.doomsday.refinementLevel,ownerAttack:value.doomsday.ownerAttack,counter:value.doomsday.counter,strikecardDamagePlus:value.doomsday.wheelStrikecardDamagePlus},
    light:value.light===null?null:{refinementLevel:value.light.refinementLevel,counter:value.light.counter},
    arachne:value.arachne===null?null:{ownerUid:value.arachne.ownerUid,basicDamagePer:value.arachne.wheelBasicDamagePer,wheels:value.arachne.wheels.map(wheel=>({...wheel}))},
  };
}

const displayWheelState=(value,multi)=>multi?contributionWheelState(value):publicWheelState(value);

function property(map,name){return Object.hasOwn(map,name)?map[name]:0;}

function appliedProperties(wheelState,multi){
  return {
    strikecardDamagePlus:wheelState.doomsday?(multi?wheelState.doomsday.wheelStrikecardDamagePlus:wheelState.doomsday.baseStrikecardDamagePlus+wheelState.doomsday.wheelStrikecardDamagePlus):null,
    basicDamagePer:wheelState.arachne?(multi?wheelState.arachne.wheelBasicDamagePer:wheelState.arachne.baseBasicDamagePer+wheelState.arachne.wheelBasicDamagePer):null,
  };
}

function damageRequest(input,step,wheelState,targetProperties,multi){
  const applied=appliedProperties(wheelState,multi);
  const casterProperties={...(multi?step.casterProperties:input.baseCasterProperties)};
  const playerProperties={...(multi?step.playerProperties:input.basePlayerProperties)};
  if(applied.strikecardDamagePlus!==null)casterProperties.strikecard_damage_plus=(multi?property(casterProperties,'strikecard_damage_plus'):0)+applied.strikecardDamagePlus;
  if(applied.basicDamagePer!==null)playerProperties.basic_damage_per=(multi?property(playerProperties,'basic_damage_per'):0)+applied.basicDamagePer;
  return {schemaVersion:2,kind:'morimens-battle-property-snapshot-damage',build:input.build,snapshotStage:input.snapshotStage,snapshotCompleteness:input.snapshotCompleteness,baseValue:step.baseValue,skillArgsPlus:step.skillArgsPlus,tags:step.tags,casterProperties,playerProperties,targetProperties,cardProperties:step.cardProperties,cardContext:step.cardContext,targetContext:step.targetContext,hitContext:step.hitContext};
}

// Composes only explicitly ordered, already recovered Wheel events with the bounded
// complete-property Active hit adapter. It never infers which event a card emits.
export function runWheelActiveTimeline(value){
  const input=clone(value),multi=input?.schemaVersion===2,keys=multi?['schemaVersion','kind','build','snapshotStage','snapshotCompleteness','initialWheelContributions','initialTargetProperties','steps']:['schemaVersion','kind','build','snapshotStage','snapshotCompleteness','initialWheelState','baseCasterProperties','basePlayerProperties','initialTargetProperties','steps'];
  if(!exact(input,keys)||![1,2].includes(input.schemaVersion)||input.kind!=='morimens-wheel-active-timeline'||!supportedBuilds.has(input.build)||input.snapshotStage!=='battle-property-server-live'||input.snapshotCompleteness!=='complete-map'||!Array.isArray(input.steps)||input.steps.length===0)throw new Error('Exact supported live-property Wheel Active timeline required');
  const initialState=multi?contributionInputState(input.initialWheelContributions):input.initialWheelState;
  // Reuse the Wheel sequence validator even when the timeline contains no event.
  runWheelEventSequence({schemaVersion:1,kind:'morimens-wheel-event-sequence',build:input.build,initialState,steps:[]});
  const maps=multi?[['initialTargetProperties',input.initialTargetProperties]]:[['baseCasterProperties',input.baseCasterProperties],['basePlayerProperties',input.basePlayerProperties],['initialTargetProperties',input.initialTargetProperties]];
  for(const [label,map] of maps)if(!map||Array.isArray(map)||Object.getPrototypeOf(map)!==Object.prototype||Object.values(map).some(item=>!Number.isFinite(item)))throw new Error(`${label} must be a finite numeric property map`);
  if(!multi&&input.initialWheelState.doomsday&&property(input.baseCasterProperties,'strikecard_damage_plus')!==input.initialWheelState.doomsday.baseStrikecardDamagePlus)throw new Error('Base caster Strike flat must match the Wheel baseline');
  if(!multi&&input.initialWheelState.arachne&&property(input.basePlayerProperties,'basic_damage_per')!==input.initialWheelState.arachne.baseBasicDamagePer)throw new Error('Base player amplification must match the Wheel baseline');
  const ids=new Set();
  for(const step of input.steps){
    if(!step||typeof step.id!=='string'||!step.id||ids.has(step.id)||typeof step.type!=='string')throw new Error('Timeline steps require unique IDs and explicit types');ids.add(step.id);
    if(step.type==='ACTIVE_HIT'){
      if(!exact(step,multi?multiHitKeys:hitKeys))throw new Error('ACTIVE_HIT requires exact fields');
      if(multi)for(const [label,map] of [['casterProperties',step.casterProperties],['playerProperties',step.playerProperties]])if(!map||Array.isArray(map)||Object.getPrototypeOf(map)!==Object.prototype||Object.values(map).some(item=>!Number.isFinite(item)))throw new Error(`${label} must be a finite numeric property map`);
      calculateSnapshotActiveDamage(damageRequest(input,step,privateWheelState(initialState),input.initialTargetProperties,multi));
    }else{
      const allowed=eventKeys[step.type];if(!allowed||!exact(step,allowed))throw new Error('Unsupported or inexact Wheel timeline event');
      runWheelEventSequence({schemaVersion:1,kind:'morimens-wheel-event-sequence',build:input.build,initialState,steps:[step]});
    }
  }
  let wheelState=privateWheelState(initialState),targetProperties={...input.initialTargetProperties},stop=null,modeledHpLost=0;
  const trace=[];
  for(const step of input.steps){
    if((targetProperties.hp??0)<=0){stop={beforeStepId:step.id,reason:'Death handling required'};break;}
    if(step.type==='ACTIVE_HIT'){
      const before={wheelState:displayWheelState(wheelState,multi),target:{hp:targetProperties.hp??0,block:targetProperties.block??0}},applied=appliedProperties(wheelState,multi);
      const result=calculateSnapshotActiveDamage(damageRequest(input,step,wheelState,targetProperties,multi));
      targetProperties={...targetProperties,hp:result.hpResolution.hpAfter,block:result.hpResolution.blockAfter};modeledHpLost+=result.modeledHpLost;
      trace.push({id:step.id,type:step.type,before,appliedWheelProperties:applied,result,after:{wheelState:displayWheelState(wheelState,multi),target:{hp:targetProperties.hp,block:targetProperties.block}}});
    }else{
      const sequence=runWheelEventSequence({schemaVersion:1,kind:'morimens-wheel-event-sequence',build:input.build,initialState:wheelState,steps:[step]});
      trace.push({id:step.id,type:step.type,before:{wheelState:displayWheelState(privateWheelState(sequence.initialState),multi),target:{hp:targetProperties.hp??0,block:targetProperties.block??0}},result:sequence.trace[0].result,after:{wheelState:displayWheelState(privateWheelState(sequence.finalState),multi),target:{hp:targetProperties.hp??0,block:targetProperties.block??0}}});
      wheelState=privateWheelState(sequence.finalState);
    }
  }
  return {schemaVersion:input.schemaVersion,kind:'morimens-wheel-active-timeline-result',analysisTrack:'theorycrafting',status:'EXPERIMENTAL_COMPOSITION',build:input.build,wheelStateSemantics:multi?'SHARED_WHEEL_CONTRIBUTIONS':'SINGLE_CASTER_BASE_PLUS_WHEEL',finalDamage:null,completed:stop===null,stop,executedSteps:trace.length,unexecutedSteps:input.steps.length-trace.length,modeledHpLost,targetAfter:{hp:targetProperties.hp??0,block:targetProperties.block??0},finalWheelState:displayWheelState(wheelState,multi),trace,unresolvedDependencies:['Events must be ordered explicitly: an AFTER_USE_CARD step occurs after that card damage, and an AFTER_PURSUIT step occurs after that pursuit damage','Only recovered Doomsday Rampage, Light of Intellect, Eternal Weave and Rota Fortunae transitions are composed',multi?'Each hit supplies its own complete caster/player base maps; only shared Wheel contributions are added to strikecard_damage_plus and basic_damage_per':'Only Wheel-derived strikecard_damage_plus and basic_damage_per are injected into the single-caster complete supplied property maps; all other properties remain caller evidence','Card legality, payment, automatic pursuit creation, deck mutation, other listeners, callbacks, death execution and gameplay validation remain unresolved']};
}
