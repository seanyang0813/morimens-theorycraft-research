import {runCardResourceTimeline} from './card-resource-timeline.mjs';
import {resolvePveCardResources} from './card-use-resources.mjs';
import {runWheelActiveTimeline} from './wheel-active-timeline.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const clone=value=>JSON.parse(JSON.stringify(value));
const supportedBuilds=new Set(['pc-res144-build51','pc-res150-build51','pc-res151-build51']);

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

function effectSteps(action,doomsdayPresent){
  const steps=action.effects.map(effect=>clone(effect));
  if(doomsdayPresent)steps.push({id:`${action.id}:after-use`,type:'AFTER_USE_CARD',cardType:action.cardType});
  return steps;
}

function wheelInput(input,wheelState,targetProperties,steps,multi){
  return multi?{schemaVersion:2,kind:'morimens-wheel-active-timeline',build:input.build,snapshotStage:input.snapshotStage,snapshotCompleteness:input.snapshotCompleteness,initialWheelContributions:wheelState,initialTargetProperties:targetProperties,steps}:
    {schemaVersion:1,kind:'morimens-wheel-active-timeline',build:input.build,snapshotStage:input.snapshotStage,snapshotCompleteness:input.snapshotCompleteness,initialWheelState:wheelState,baseCasterProperties:input.baseCasterProperties,basePlayerProperties:input.basePlayerProperties,initialTargetProperties:targetProperties,steps};
}

// Pays and checks each supplied card before exposing its explicit Active/pursuit
// effects. A supported Doomsday after-use event is appended only for accepted
// cards and only after all supplied effects of that card finish.
export function runPaidWheelActiveTimeline(value){
  const input=clone(value),multi=input?.schemaVersion===2,keys=multi?['schemaVersion','kind','build','initialEnergy','snapshotStage','snapshotCompleteness','initialWheelContributions','initialTargetProperties','actions']:['schemaVersion','kind','build','initialEnergy','snapshotStage','snapshotCompleteness','initialWheelState','baseCasterProperties','basePlayerProperties','initialTargetProperties','actions'];
  if(!exact(input,keys)||![1,2].includes(input.schemaVersion)||input.kind!=='morimens-paid-wheel-active-timeline'||!supportedBuilds.has(input.build)||!Array.isArray(input.actions)||input.actions.length===0)throw new Error('Exact supported paid Wheel Active timeline required');
  const initialWheelState=multi?input.initialWheelContributions:input.initialWheelState;
  const resourceSteps=[],allEffects=[],ids=new Set();
  for(const action of input.actions){
    if(!exact(action,['id','cardInstanceId','cardType','costInput','conditions','effects'])||typeof action.id!=='string'||!action.id||typeof action.cardInstanceId!=='string'||!action.cardInstanceId||typeof action.cardType!=='string'||!action.cardType||!Array.isArray(action.effects)||action.effects.length===0||action.effects.every(effect=>effect?.type!=='ACTIVE_HIT'))throw new Error('Each paid Wheel action requires identity, card type, resources and at least one Active hit');
    if(action.conditions?.strike!==(action.cardType==='Card_Strike'))throw new Error('Card type and supplied Strike condition must agree');
    if(ids.has(action.id)||ids.has(`${action.id}:after-use`))throw new Error('Action and effect IDs must be unique');ids.add(action.id);ids.add(`${action.id}:after-use`);
    for(const effect of action.effects){if(!effect||!['ACTIVE_HIT','AFTER_PURSUIT'].includes(effect.type))throw new Error('Paid Wheel actions support only explicit Active hits and post-pursuit events');if(ids.has(effect.id))throw new Error('Action and effect IDs must be unique');ids.add(effect.id);allEffects.push(effect);}
    if(initialWheelState.doomsday)allEffects.push({id:`${action.id}:after-use`,type:'AFTER_USE_CARD',cardType:action.cardType});
    resourceSteps.push({id:action.id,cardInstanceId:action.cardInstanceId,costInput:action.costInput,conditions:action.conditions});
  }
  runCardResourceTimeline({schemaVersion:1,kind:'morimens-card-resource-timeline',build:input.build,interveningEffects:'assumed-absent',initialEnergy:input.initialEnergy,steps:resourceSteps});
  runWheelActiveTimeline(wheelInput(input,initialWheelState,input.initialTargetProperties,allEffects,multi)); // validates every effect suffix
  let energy=input.initialEnergy,target=clone(input.initialTargetProperties),wheelState=multi?clone(initialWheelState):privateWheelState(initialWheelState),stop=null,acceptedActions=0;
  const trace=[],dependencies=new Set();
  for(const action of input.actions){
    if((target.hp??0)<=0){stop={beforeActionId:action.id,phase:'before-payment',reason:'Death handling required'};break;}
    const resources=resolvePveCardResources({costInput:{...action.costInput,energy},conditions:action.conditions});resources.unresolvedDependencies.forEach(item=>dependencies.add(item));
    const row={actionId:action.id,cardInstanceId:action.cardInstanceId,cardType:action.cardType,energyBefore:energy,energyAfter:resources.energyAfter,resources,effect:null};trace.push(row);
    if(!resources.check.allowed){stop={actionId:action.id,phase:'play-check',gate:resources.check.gate,reasonCode:resources.check.reasonCode};break;}
    energy=resources.energyAfter;row.energyAfter=energy;acceptedActions++;
    const effect=runWheelActiveTimeline(wheelInput(input,wheelState,target,effectSteps(action,wheelState.doomsday!==null),multi));row.effect=effect;effect.unresolvedDependencies.forEach(item=>dependencies.add(item));
    target={...target,hp:effect.targetAfter.hp,block:effect.targetAfter.block};wheelState=multi?clone(effect.finalWheelState):privateWheelState(effect.finalWheelState);
    if(!effect.completed){stop={actionId:action.id,phase:'effects',detail:effect.stop};break;}
  }
  return {schemaVersion:input.schemaVersion,kind:'morimens-paid-wheel-active-timeline-result',analysisTrack:'theorycrafting',status:'EXPERIMENTAL_COMPOSITION',build:input.build,wheelStateSemantics:multi?'SHARED_WHEEL_CONTRIBUTIONS':'SINGLE_CASTER_BASE_PLUS_WHEEL',finalDamage:null,completed:stop===null,stop,initialEnergy:input.initialEnergy,energyAfter:energy,modeledEnergyLost:input.initialEnergy-energy,acceptedActions,unattemptedActions:input.actions.length-trace.length,initialTarget:{hp:input.initialTargetProperties.hp??0,block:input.initialTargetProperties.block??0},targetAfter:{hp:target.hp??0,block:target.block??0},modeledHpLost:(input.initialTargetProperties.hp??0)-(target.hp??0),finalWheelState:multi?clone(wheelState):publicWheelState(wheelState),trace,unresolvedDependencies:[...dependencies,'Ordinary PvE play checks and payment are composed before each accepted action; rejected actions expose no damage or Wheel event','Doomsday after-use is appended after all supplied effects of an accepted card; exact multi-listener scheduler ordering and lethal-card after-use delivery remain unresolved',multi?'Every Active hit retains its own complete caster/player base maps while shared Wheel contributions carry between paid actions':'Every Active hit uses the explicit single-caster base maps while Wheel state carries between paid actions','Each action may explicitly place Arachne post-pursuit events; pursuit generation, target selection and other events are not inferred','Hand removal, draw, refunds, changing costs/conditions, turn transitions, death execution and gameplay validation remain unresolved']};
}
