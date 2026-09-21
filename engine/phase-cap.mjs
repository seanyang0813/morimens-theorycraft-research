import {resolveOrdinaryActiveHp} from './ordinary-active-hp.mjs';
import {enqueueHpPropertyEvents} from './hp-events.mjs';
import {ResearchEventDispatcher} from './event-dispatch.mjs';
import {ResearchEffectOrder} from './effect-order.mjs';

function integer(value,name,min=0){if(!Number.isSafeInteger(value)||value<min)throw new Error('Explicit safe integer required: '+name);}
function checkPhase(state){
  for(const name of ['maxHp','phaseLayers','counter'])integer(state[name],name,name==='maxHp'?1:0);
  if(![0,60408,60409].includes(state.phaseId)||typeof state.immune!=='boolean')throw new Error('Explicit supported phase and immunity required');
  if((state.phaseId===0)!==(state.phaseLayers===0))throw new Error('Phase identity and layers must agree');
  if(state.counter>999999999||state.phaseLayers>999999999)throw new Error('State layer maximum exceeded');
}

// Cmd 60406 / 60405 for an eligible negative HP-change event.
// Integer-only subset; no other coexisting states or transition listeners.
export function resolvePhaseHpLoss(state,hpLoss){
  checkPhase(state);integer(hpLoss,'hpLoss');
  const next={...state},operations=[];
  if(!hpLoss||!state.phaseId)return {state:next,operations};
  next.counter=Math.min(999999999,next.counter+hpLoss);
  operations.push({type:'addCounter',stateId:60407,requested:hpLoss,layers:next.counter});
  next.phaseLayers=state.phaseLayers>hpLoss?state.phaseLayers-hpLoss:1;
  operations.push({type:'subtractPhase',stateId:state.phaseId,layers:next.phaseLayers});
  if(next.phaseLayers===1){
    next.immune=true;operations.push({type:'addState',stateId:46441,layers:1});
    const skillId=state.phaseId===60409?60397:60398;
    operations.push({type:'changeMonsterSkill',skillId,slot:1});
    if(state.phaseId===60409){
      next.phaseId=60408;next.phaseLayers=Math.ceil(state.maxHp*.33)+1;
      operations.push({type:'addState',stateId:60408,layers:next.phaseLayers});
    }else {next.phaseId=0;next.phaseLayers=0;}
    next.counter=0;operations.push({type:'removeState',stateId:60407},{type:'removeState',stateId:state.phaseId});
  }
  return {state:next,operations};
}

export function simulatePhaseCapHits(input){
  const {hp:initialHp,block:initialBlock,phase:initialPhase,hits}=input;
  integer(initialHp,'hp',1);integer(initialBlock,'block');checkPhase(initialPhase);
  if(initialHp>initialPhase.maxHp)throw new Error('HP exceeds max HP');
  if(!Array.isArray(hits)||hits.length===0||Array.from({length:hits.length},(_,i)=>!Object.hasOwn(hits,i)).some(Boolean))throw new Error('Dense nonempty pre-hit damage list required');
  hits.forEach(n=>integer(n,'incomingDamage'));
  let hp=initialHp,block=initialBlock,phase={...initialPhase};
  const trace=[],order=new ResearchEffectOrder(),events=new ResearchEventDispatcher();
  let activeRecord;
  events.register(203,(_target,payload)=>{
    if(payload.uid!==1||payload.newValue>=payload.oldValue||!phase.phaseId)return;
    order.enqueue(()=>{
      const transition=resolvePhaseHpLoss(phase,payload.oldValue-payload.newValue);
      phase=transition.state;activeRecord.phaseOperations=transition.operations;
    });
  },{eventPriority:99});
  order.enqueue(index=>{
    const incomingDamage=hits[index],before={hp,block,phase:{...phase}};
    if(hp===0){trace.push({hit:index+1,incomingDamage,skipped:'target has no HP',before});return;}
    const {record}=resolveOrdinaryActiveHp({damage:incomingDamage,block,puncture:false,hp,retainHp:0,limit:phase.phaseId?Math.ceil(phase.maxHp*.33):0,usedLimit:phase.counter,deathResist:0,genericImmunity:phase.immune,preventActiveDamage:false});
    block=record.blockAfter;const old=hp;hp=record.curHp;
    activeRecord={hit:index+1,incomingDamage,before,shieldLoss:record.blockLose,hpLossRequest:record.changeVal,hpLost:record.realDamage,hpAfter:hp,phaseOperations:[]};trace.push(activeRecord);
    enqueueHpPropertyEvents({property:'hp',old,new:hp,hp,max_hp:phase.maxHp,uid:1,castRoleUid:2},(id,data)=>order.enqueue(()=>events.send(id,data)));
    order.enqueue(()=>{activeRecord.after={hp,block,phase:{...phase}};});
  },{repetitions:hits.length});
  order.run();
  if(events.errors.length)throw events.errors[0].error;
  return {status:'EXPERIMENTAL',finalDamage:null,modeledHpLost:initialHp-hp,ending:{hp,block,phase},trace,evidence:['PC144:PhaseCapCommands','PC144:PhaseCapExpressions','PC144:PhaseTransitionEffects','PC144:PhaseLiveLayerEffects','PC144:ConnectedHpPhaseCapCommand','PC144:EffectOrder','PC144:OrdinaryHpSubtraction','PC144:HpOwnerEvents'],limitations:['Explicit initial state, ordinary non-puncture Active hits, integer HP and layers only','State eligibility assumed; no hidden/deleted/banned owner or other coexisting states','Transition skills recorded, not executed; no turn advancement or immunity-clear callbacks','No general death processing, statistics or independent gameplay validation']};
}
