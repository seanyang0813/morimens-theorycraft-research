import {createHash} from 'node:crypto';
import {buildReplayActionCandidate} from './replay-action-candidate.mjs';

const clone=value=>JSON.parse(JSON.stringify(value));
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const roleType={Awaker:1,Monster:2};

// Selects by pre-outcome support only. The recorded amount, crit flag, HP loss and
// block loss are replaced before the ordinary replay adapter is invoked.
export function buildBlindReplayPrediction({index,skills,commands,monsters,awakeners}){
  if(!index||index.kind!=='MORIMENS_REPLAY_EVENT_INDEX')throw new Error('Replay event index required');
  const blockers=[];
  for(const sourceAction of index.actionSnapshots??[]){
    try{
      if(sourceAction.boundaryStatus!=='COMPLETE')throw new Error('Complete action boundary required');
      const played=sourceAction.cards?.[String(sourceAction.cardUid)];
      if(!played||!Number.isSafeInteger(played.ownerUid)||!Number.isSafeInteger(played.tid))throw new Error('Played card identity required');
      const caster=sourceAction.roles?.[String(played.ownerUid)];
      if(!caster||caster.roleType!==roleType.Awaker||caster.camp!==played.camp)throw new Error('Captured Awakener owner required');
      const enemies=Object.values(sourceAction.roles??{}).filter(role=>role?.roleType===roleType.Monster&&role.camp!==played.camp&&Number.isFinite(role.properties?.hp)&&role.properties.hp>0);
      if(enemies.length!==1)throw new Error('Exactly one living enemy required before outcome');
      const target=enemies[0],snapshots=[...(sourceAction.window?.hitSnapshots??[])].sort((a,b)=>(a.recordIndex-b.recordIndex)||(a.frameIndex-b.frameIndex));
      if(!snapshots.length)throw new Error('A pre-hit boundary is required');
      const first=clone(snapshots[0]);
      if(first.boundaryStatus!=='COMPLETE')throw new Error('Complete first pre-hit boundary required');
      const firstTarget=first.roles?.[String(target.uid)],actionTarget=sourceAction.roles?.[String(target.uid)];
      if(!firstTarget||firstTarget.tid!==target.tid||!actionTarget)throw new Error('Stable one-enemy identity required');
      first.roles[String(target.uid)].properties.hp=actionTarget.properties.hp;
      first.roles[String(target.uid)].properties.block=actionTarget.properties.block;
      first.reconstruction={};
      first.hitData={roleUid:target.uid,beHitConfig:{castRoleUid:caster.uid,skillConfigId:played.tid}};
      const syntheticHit={recordIndex:first.recordIndex,frameIndex:first.frameIndex,eventName:'BeHit',data:clone(first.hitData)};
      const action=clone(sourceAction);
      action.window={selectedTargetCommands:clone(sourceAction.window?.selectedTargetCommands??[]),events:[clone(syntheticHit)],hits:[clone(syntheticHit)],hitSnapshots:[first]};
      const sealedIndex={kind:index.kind,build:index.build,actionSnapshots:[action]};
      action.actionIndex=0;
      const candidate=buildReplayActionCandidate({index:sealedIndex,actionIndex:0,hitIndex:first.hitIndex,skills,commands,monsters,awakeners,preOutcome:true});
      if(candidate.status!=='CALCULATED_REGRESSION_CANDIDATE'||!candidate.calculation||candidate.comparison!==null||candidate.observedHit!==null)throw new Error('Deterministic outcome-free calculation required');
      return {
        schemaVersion:1,kind:'MORIMENS_BLIND_REPLAY_PREDICTION',build:candidate.build,
        selectionPolicy:'first complete deterministic action with one living enemy and a complete first pre-hit boundary',
        sourceActionIndex:sourceAction.actionIndex,sourceHitIndex:first.hitIndex,
        scenario:candidate.scenario,calculation:candidate.calculation,predictedDamage:candidate.calculation.preHitDamage,
        routing:{skillId:played.tid,commandId:candidate.identities.commandId,rowId:candidate.identities.rowId,parameters:candidate.routing.parameters,tags:candidate.routing.tags,repetitionPerExecution:candidate.repetition.perExecution,targetBindingSource:candidate.routing.targetBindingSource,commandSourceShape:candidate.routing.commandSourceShape},
        identityCommitmentSha256:hash({cardUid:played.uid,skillId:played.tid,casterUid:caster.uid,targetUid:target.uid}),
        sealedProjectionSha256:hash({action,scenario:candidate.scenario,routing:candidate.routing}),
        blockersBeforeSelection:blockers,
        unresolvedDependencies:candidate.unresolvedDependencies
      };
    }catch(error){blockers.push({actionIndex:sourceAction.actionIndex,reason:error.message});}
  }
  throw new Error(`No blind deterministic replay candidate: ${JSON.stringify(blockers)}`);
}
