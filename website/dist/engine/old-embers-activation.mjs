import {damageTriggerPayload} from './damage-triggers.mjs';
import {stateTriggerEligible} from './trigger-eligibility.mjs';
import {runCachedStateTrigger} from './state-callback.mjs';
import {stateOwnerTargets} from './state-owner-target.mjs';
import {enqueueSkillPhase} from './skill-phase.mjs';
import {enqueueOldEmbersCommand} from './old-embers-command.mjs';

// One State80575 activation, non-yielding and unbanned/non-relic. This does not
// construct the original command class or manage cached/reentrant activations.
export function enqueueOldEmbersActivation({scheduler,eventName,event,target,caster,state,context,getState,getStateLayer,executeStep,canContinue,hooks}){
  const hookNames=['getTime','getSkillCastTime','beforePhase','timeline','afterCreate','finish','endPhase','stateTriggerEnd','missingState'];
  if(!state||state.id!==80575||typeof state.ownerIsMonster!=='boolean'||!state.owner||!event||!Number.isFinite(event.castDamage)||event.castDamage<0||!hooks||hookNames.some(k=>typeof hooks[k]!=='function')||[getState,getStateLayer,executeStep,canContinue].some(fn=>typeof fn!=='function'))throw new Error('Explicit Old Embers activation and lifecycle adapters required');
  if(context.stateUid!==state.uid||context.castRoleUid!==state.owner.uid||context.targetType!=='StateOwner'||context.hasJudgment)throw new Error('State80575 callback context mismatch');
  const report={status:'EXPERIMENTAL',finalDamage:null,activated:false,commandId:null,rows:[],command:null,
    unresolvedDependencies:['Single activation; original command construction/cache not executed','Caller-supplied state mutation, eligibility and lifecycle hooks','Death/phase transition implementation and independent gameplay validation']};
  let handler,half=false;
  if(eventName==='AttackedByTentacle')handler='BSTAfterAttackedByTentacle';
  else if(eventName==='BeDamage'){
    handler={Active:'BSTAfterBeActiveDamage',Passive:'BSTAfterPassiveDamage',Fixed:'BSTAfterFixedDamage'}[event.damageType];
    half=event.damageType==='Passive'||event.damageType==='Fixed';
  }
  if(!handler)return report;
  const triggerData=damageTriggerPayload({handler,event,target,caster,mode:'None',tryTrigger:(triggerCamp,roleUid)=>stateTriggerEligible({
    deleted:context.deleted,monster:state.ownerIsMonster,enemy:false,ownerUid:state.owner.uid,ownerCamp:state.owner.camp,triggerCamp,roleUid})});
  if(!triggerData)return report;
  report.commandId=half?81060:80572;
  const command={isDeleted:false,cmdParser:{upperTargets:[],members:{}},stats:{},
    clearMemberValues(){this.cmdParser.members={};},checkCondition(){throw new Error('Unexpected State80575 judgment');},
    setIsDeleted(v){this.isDeleted=v;},getUpperTargets(){return this.cmdParser.upperTargets;},
    getSkillCastTime:hooks.getSkillCastTime,onEnterBeforePhase:hooks.beforePhase,sendTimeline:hooks.timeline,
    triggerCmd(data){
      // Command rows execute only against the generated StateOwner target.
      if(this.cmdParser.upperTargets.length===0)return;
      if(this.cmdParser.upperTargets.length!==1||this.cmdParser.upperTargets[0]!==state.owner)throw new Error('StateOwner identity changed; single-activation adapter cannot retarget');
      const commandReport=enqueueOldEmbersCommand({scheduler,argument:data.triggerValue*(half?.5:1),getStateLayer,executeStep,canContinue});
      report.rows=commandReport.trace;
      report.command=commandReport.command;
    }};
  report.activated=runCachedStateTrigger({context,command,triggerData,
    createEffect:config=>{
      if(config.effectType==='BEGenerateTargets')scheduler.enqueue(()=>{
        if(canContinue())command.cmdParser.upperTargets=stateOwnerTargets({stateUid:state.uid,getState,onMissingState:hooks.missingState});
      });
      else scheduler.enqueue(()=>{
        if(canContinue())enqueueSkillPhase({scheduler,start:{command,skipPhase:false,skipTimeline:false,triggerData:config.triggerData,getTime:hooks.getTime,afterCreate:hooks.afterCreate},emitFinish:hooks.finish,endEffect:hooks.endPhase});
      });
    },emitEnd:payload=>scheduler.enqueue(()=>hooks.stateTriggerEnd(payload))});
  return report;
}
