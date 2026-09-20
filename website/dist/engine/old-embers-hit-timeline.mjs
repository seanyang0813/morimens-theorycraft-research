import {runResolvedHitTimeline} from './resolved-hit-timeline.mjs';
import {ResearchEffectOrder} from './effect-order.mjs';
import {enqueueOldEmbersActivation} from './old-embers-activation.mjs';
import {resolveHpAttributeLoss} from './hp-attribute-loss.mjs';
import {subtractStateLayer} from './sub-state-layer.mjs';

// Controlled composition: ordinary visible monster, one unbanned Old Embers state,
// no other reactive effects, HP-loss immunities/limits, or reentrant activations.
export function runOldEmbersHitTimeline(input){
  if(!input||input.interveningEffects!=='old-embers-only-assumed'||Object.keys(input).some(k=>!['schemaVersion','build','interveningEffects','target','steps','oldEmbersLayers'].includes(k)))throw new Error('Explicit Old-Embers-only research scope required');
  if(!Number.isSafeInteger(input.oldEmbersLayers)||input.oldEmbersLayers<0||input.oldEmbersLayers>999999999)throw new Error('Explicit nonnegative Old Embers layers required');
  const {oldEmbersLayers,...timeline}=input;
  // Reuse the base runner's validation before applying any shared-state effects.
  runResolvedHitTimeline({...timeline,interveningEffects:'assumed-absent'});
  const owner={uid:1,camp:2},caster={uid:2,camp:1},state={id:80575,uid:3,owner,ownerIsMonster:true};
  const layers={80575:oldEmbersLayers,80593:0,80594:0,66314:0,62317:0};
  let target={...input.target},stop=null;const trace=[],dependencies=new Set();
  for(const step of input.steps){
    if(target.hp<=0){stop={beforeStepId:step.id,reason:'Death handling required'};break;}
    const before={...target},beforeLayers=layers[80575];
    const hit=runResolvedHitTimeline({...timeline,target,steps:[step],interveningEffects:'assumed-absent'});
    for(const dependency of hit.unresolvedDependencies)if(dependency!=='Intervening state effects, triggers and callbacks are assumed absent, not reconstructed')dependencies.add(dependency);
    if(!hit.completed){stop=hit.stop;break;}
    target={...hit.targetAfter};
    const record={stepId:step.id,before,oldEmbersBefore:beforeLayers,hit:hit.trace[0],generatedEffects:[]};trace.push(record);
    if(target.hp<=0){stop={afterStepId:step.id,reason:'Lethal hit requires death/event ordering before Old Embers can be resolved'};record.after={...target};record.oldEmbersAfter=layers[80575];break;}
    if(layers[80575]>0){
      const scheduler=new ResearchEffectOrder();
      const context={banned:false,relicSource:false,hidden:0,deleted:false,card:false,dead:false,prohibitDead:false,configured:true,commandExists:true,hasJudgment:false,targetType:'StateOwner',stateUid:3,castRoleUid:1};
      const noop=()=>{};
      const report=enqueueOldEmbersActivation({scheduler,eventName:'BeDamage',event:{...hit.trace[0].result.hitTriggerValues,damageType:step.scenario.damageType[0]+step.scenario.damageType.slice(1).toLowerCase(),targetRoleUid:1,isCrit:false},target:owner,caster,state,context,
        getState:()=>layers[80575]>0?state:null,getStateLayer:id=>layers[id],canContinue:()=>target.hp>0,
        hooks:{getTime:()=>0,getSkillCastTime:noop,beforePhase:noop,timeline:noop,afterCreate:noop,finish:noop,endPhase:noop,stateTriggerEnd:noop,missingState:noop},
        executeStep:effect=>{
          const effectBefore={hp:target.hp,layers:{...layers}};
          let hpCalculation=null,stackCalculation=null;
          if(effect.type==='addState')layers[effect.stateId]=effect.layers;
          if(effect.type==='removeState')layers[effect.stateId]=0;
          if(effect.type==='subtractState'){stackCalculation=subtractStateLayer({layers:layers[effect.stateId],amount:effect.rawAmount,exists:true,casterAttribution:'absent'});layers[effect.stateId]=stackCalculation.layersAfter;}
          if(effect.type==='changeHp'){hpCalculation=resolveHpAttributeLoss({hp:target.hp,rawValue:effect.rawValue,immunity:0,limit:0});target.hp=hpCalculation.result.hpAfter;}
          record.generatedEffects.push({id:`${step.id}/old-embers/row-${effect.row}`,parentStepId:step.id,effect,before:effectBefore,after:{hp:target.hp,layers:{...layers}},hpCalculation,stackCalculation});
        }});
      scheduler.run();record.activation=report;
    }
    record.after={...target};record.oldEmbersAfter=layers[80575];
    if(target.hp<=0){stop={afterStepId:step.id,reason:'Generated HP loss requires death handling; later command rows and hits are unresolved'};break;}
  }
  return {schemaVersion:1,status:'EXPERIMENTAL',build:input.build,finalDamage:null,completed:stop===null,stop,trace,executedSteps:trace.length,remainingSteps:input.steps.length-trace.length,initialTarget:{...input.target},targetAfter:target,oldEmbersLayersAfter:layers[80575],modeledHpLost:input.target.hp-target.hp,
    unresolvedDependencies:[...dependencies,'Controlled ordinary visible monster with one unbanned non-relic Old Embers state; other states/effects assumed absent','State layer mutation uses explicit adapters; command cache/reentrancy and lifecycle side effects are not modeled','No HP-loss immunity/limits, death handling, card legality or automatic pursuits','Composition has not been compared with a connected original hit-to-trigger runtime or independent gameplay']};
}
