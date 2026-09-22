import {advanceDoomsdayAfterUseCard,advanceLightOfIntellectAfterKeeperSkill,advanceArachneAfterPursuit} from './wheel-trigger-transitions.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const clone=value=>JSON.parse(JSON.stringify(value));
const finite=value=>Number.isFinite(value);
const refinement=value=>Number.isSafeInteger(value)&&value>=0&&value<=3;
const counter=(value,max)=>Number.isSafeInteger(value)&&value>=0&&value<=max;
const supportedBuilds=new Set(['pc-res144-build51','pc-res150-build51']);

function validateInitial(value){
  if(!exact(value,['doomsday','light','arachne']))throw new Error('Exact Wheel sequence initial state required');
  if(value.doomsday!==null&&(!exact(value.doomsday,['refinementLevel','ownerAttack','counter','baseStrikecardDamagePlus','wheelStrikecardDamagePlus'])||!refinement(value.doomsday.refinementLevel)||!finite(value.doomsday.ownerAttack)||value.doomsday.ownerAttack<0||!counter(value.doomsday.counter,8)||!finite(value.doomsday.baseStrikecardDamagePlus)||!finite(value.doomsday.wheelStrikecardDamagePlus)))throw new Error('Explicit Doomsday sequence state required');
  if(value.light!==null&&(!exact(value.light,['refinementLevel','counter'])||!refinement(value.light.refinementLevel)||!counter(value.light.counter,1)))throw new Error('Explicit Light of Intellect sequence state required');
  if(value.arachne!==null){
    if(!exact(value.arachne,['ownerUid','baseBasicDamagePer','wheelBasicDamagePer','wheels'])||!Number.isSafeInteger(value.arachne.ownerUid)||!finite(value.arachne.baseBasicDamagePer)||!finite(value.arachne.wheelBasicDamagePer)||!Array.isArray(value.arachne.wheels)||value.arachne.wheels.length>2)throw new Error('Explicit Arachne Wheel sequence state required');
    const slots=new Set();for(const wheel of value.arachne.wheels){if(!exact(wheel,['slotId','wheelId','refinementLevel','triggersUsed'])||typeof wheel.slotId!=='string'||!wheel.slotId||slots.has(wheel.slotId)||!['wheel-0128','wheel-0132'].includes(wheel.wheelId)||!refinement(wheel.refinementLevel)||!counter(wheel.triggersUsed,5))throw new Error('Explicit supported Arachne Wheel counter required');slots.add(wheel.slotId);}
  }
}

function publicState(state){
  const copy=clone(state);
  if(copy.doomsday)copy.doomsday.strikecardDamagePlus=copy.doomsday.baseStrikecardDamagePlus+copy.doomsday.wheelStrikecardDamagePlus;
  if(copy.arachne)copy.arachne.basicDamagePer=copy.arachne.baseBasicDamagePer+copy.arachne.wheelBasicDamagePer;
  return copy;
}

export function runWheelEventSequence(input){
  if(!exact(input,['schemaVersion','kind','build','initialState','steps'])||input.schemaVersion!==1||input.kind!=='morimens-wheel-event-sequence'||!supportedBuilds.has(input.build)||!Array.isArray(input.steps))throw new Error('Exact supported Wheel event sequence required');
  validateInitial(input.initialState);const state=clone(input.initialState),initialState=publicState(state),trace=[],ids=new Set();
  for(const step of input.steps){
    if(!step||typeof step.id!=='string'||!step.id||ids.has(step.id)||typeof step.type!=='string')throw new Error('Wheel sequence steps require unique IDs and explicit types');ids.add(step.id);
    const before=publicState(state);let result;
    if(step.type==='AFTER_USE_CARD'){
      if(!exact(step,['id','type','cardType'])||!state.doomsday)throw new Error('AFTER_USE_CARD requires exact step and Doomsday state');
      result=advanceDoomsdayAfterUseCard({schemaVersion:1,kind:'morimens-after-use-card-wheel-trigger',build:input.build,wheelId:'wheel-0029',refinementLevel:state.doomsday.refinementLevel,cardType:step.cardType,ownerAttack:state.doomsday.ownerAttack,counter:state.doomsday.counter,strikecardDamagePlus:before.doomsday.strikecardDamagePlus});
      state.doomsday.counter=result.transition.counterAfter;state.doomsday.wheelStrikecardDamagePlus+=result.transition.addedStrikecardDamagePlus;
    }else if(step.type==='AFTER_KEEPER_SKILL'){
      if(!exact(step,['id','type','roll','matchingStrikeAvailable'])||!state.light)throw new Error('AFTER_KEEPER_SKILL requires exact step and Light of Intellect state');
      result=advanceLightOfIntellectAfterKeeperSkill({schemaVersion:1,kind:'morimens-after-keeper-skill-wheel-trigger',build:input.build,wheelId:'wheel-0117',refinementLevel:state.light.refinementLevel,counter:state.light.counter,roll:step.roll,matchingStrikeAvailable:step.matchingStrikeAvailable});state.light.counter=result.transition.counterAfter;
    }else if(step.type==='AFTER_PURSUIT'){
      if(!exact(step,['id','type','pursuitOwnerUid'])||!state.arachne)throw new Error('AFTER_PURSUIT requires exact step and Arachne Wheel state');
      result=advanceArachneAfterPursuit({schemaVersion:1,kind:'morimens-after-pursuit-wheel-triggers',build:input.build,ownerUid:state.arachne.ownerUid,pursuitOwnerUid:step.pursuitOwnerUid,basicDamagePer:before.arachne.basicDamagePer,wheels:state.arachne.wheels});
      state.arachne.wheelBasicDamagePer+=result.addedBasicDamagePer;state.arachne.wheels=result.transitions.map(row=>({slotId:row.slotId,wheelId:row.wheelId,refinementLevel:row.refinementLevel,triggersUsed:row.triggersUsedAfter}));
    }else if(step.type==='AFTER_BOUT_END'||step.type==='BEFORE_BATTLE_END'){
      if(!exact(step,['id','type']))throw new Error('Lifecycle Wheel step has unknown fields');
      const battleEnd=step.type==='BEFORE_BATTLE_END';
      if(state.doomsday){state.doomsday.counter=0;state.doomsday.wheelStrikecardDamagePlus=0;}
      if(state.light)state.light.counter=0;
      if(state.arachne){state.arachne.wheelBasicDamagePer=0;state.arachne.wheels=state.arachne.wheels.map(wheel=>({...wheel,triggersUsed:battleEnd||wheel.wheelId==='wheel-0128'?0:wheel.triggersUsed}));}
      result={schemaVersion:1,kind:'morimens-wheel-lifecycle-transition-result',analysisTrack:'theorycrafting',status:'SOURCE_DERIVED_TRANSITION',event:step.type==='AFTER_BOUT_END'?'BSTAfterBoutEnd':'BSTBeforeBattleEnd',finalDamage:null};
    }else throw new Error('Unsupported Wheel sequence step type');
    trace.push({id:step.id,type:step.type,before,after:publicState(state),result});
  }
  return {schemaVersion:1,kind:'morimens-wheel-event-sequence-result',analysisTrack:'theorycrafting',status:'SOURCE_DERIVED_SEQUENCE',build:input.build,initialState,finalState:publicState(state),trace,finalDamage:null,limitations:['Only the four explicit supported event families are dispatched; no event is inferred from a card or skill','Base properties must exclude the temporary contributions tracked separately in wheelStrikecardDamagePlus and wheelBasicDamagePer','Lifecycle clearing follows the recovered states: Eternal resets per turn, Rota persists until battle end, temporary amplification resets per turn','No card play, deck ordering, damage, other state, callback, legality, target selection, optimizer or gameplay validation']};
}
