import {createHash} from 'node:crypto';
import {buildReplayActionCandidate} from './replay-action-candidate.mjs';
import {buildFixedReplayActionCandidate} from './replay-fixed-candidate.mjs';

const clone=value=>JSON.parse(JSON.stringify(value));
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const roleType={Awaker:1,Monster:2};

// Selects by pre-outcome support plus identity-only hit routing. The recorded
// amount, crit flag, HP loss and block loss are replaced before the ordinary
// replay adapter is invoked. This predicts damage conditional on the recorded
// target/caster/skill identity; it does not claim to predict target selection.
export function buildBlindReplayPrediction({index,skills,commands,monsters,awakeners,combatBuild='pc-res144-build51',critRoll=null}){
  if(!index||index.kind!=='MORIMENS_REPLAY_EVENT_INDEX')throw new Error('Replay event index required');
  if(critRoll!==null&&(!Number.isSafeInteger(critRoll)||critRoll<1||critRoll>100))throw new Error('Conditional critical roll must be an integer from 1 to 100');
  const blockers=[];
  for(const sourceAction of index.actionSnapshots??[]){
    let played,caster,snapshots,hits,directHits;
    try{
      if(sourceAction.boundaryStatus!=='COMPLETE')throw new Error('Complete action boundary required');
      played=sourceAction.cards?.[String(sourceAction.cardUid)];
      if(!played||!Number.isSafeInteger(played.ownerUid)||!Number.isSafeInteger(played.tid))throw new Error('Played card identity required');
      caster=sourceAction.roles?.[String(played.ownerUid)];
      if(!caster||caster.roleType!==roleType.Awaker||caster.camp!==played.camp)throw new Error('Captured Awakener owner required');
      snapshots=[...(sourceAction.window?.hitSnapshots??[])].sort((a,b)=>(a.recordIndex-b.recordIndex)||(a.frameIndex-b.frameIndex));
      if(!snapshots.length)throw new Error('A pre-hit boundary is required');
      hits=sourceAction.window?.hits??[];
      directHits=snapshots.map(snapshot=>({snapshot,hit:hits.find(item=>item.recordIndex===snapshot.recordIndex&&item.frameIndex===snapshot.frameIndex)})).filter(({snapshot,hit})=>snapshot.boundaryStatus==='COMPLETE'&&[1,6].includes(hit?.data?.beHitConfig?.damageType)&&hit.data.beHitConfig.castRoleUid===caster.uid&&hit.data.beHitConfig.skillConfigId===played.tid&&Number.isSafeInteger(hit.data?.roleUid));
      if(!directHits.length)throw new Error('Complete direct-hit identity boundary required');
    }catch(error){blockers.push({actionIndex:sourceAction.actionIndex,hitIndex:null,reason:error.message});continue;}
    for(const direct of directHits){
      try{
        if(hits.some(hit=>(hit.recordIndex<direct.hit.recordIndex||(hit.recordIndex===direct.hit.recordIndex&&hit.frameIndex<direct.hit.frameIndex))))
          throw new Error('Prior hit in this action prevents outcome-free target HP/Block reconstruction');
        const first=clone(direct.snapshot),target=sourceAction.roles?.[String(direct.hit.data.roleUid)];
        if(!target||target.roleType!==roleType.Monster||target.camp===played.camp||!Number.isFinite(target.properties?.hp)||target.properties.hp<=0)throw new Error('Living enemy target identity required before outcome');
        const firstTarget=first.roles?.[String(target.uid)],actionTarget=sourceAction.roles?.[String(target.uid)];
        if(!firstTarget||firstTarget.tid!==target.tid||!actionTarget)throw new Error('Stable target identity required');
        const startProperties=actionTarget.properties??{};
        const startBlock=Object.hasOwn(startProperties,'block')?startProperties.block:0;
        if(!Number.isFinite(startProperties.hp)||!Number.isFinite(startBlock))throw new Error('Finite card-use target HP and Block required');
        first.roles[String(target.uid)].properties.hp=startProperties.hp;
        first.roles[String(target.uid)].properties.block=startBlock;
        first.reconstruction={};
        const damageType=direct.hit.data.beHitConfig.damageType;
        first.hitData={roleUid:target.uid,beHitConfig:{castRoleUid:caster.uid,skillConfigId:played.tid,damageType}};
        const syntheticHit={recordIndex:first.recordIndex,frameIndex:first.frameIndex,eventName:'BeHit',data:clone(first.hitData)};
        const action=clone(sourceAction);
        action.window={selectedTargetCommands:clone(sourceAction.window?.selectedTargetCommands??[]),events:[clone(syntheticHit)],hits:[clone(syntheticHit)],hitSnapshots:[first]};
        const sealedIndex={kind:index.kind,build:index.build,actionSnapshots:[action]};
        action.actionIndex=0;
        const candidate=damageType===6?buildFixedReplayActionCandidate({index:sealedIndex,actionIndex:0,hitIndex:first.hitIndex,skills,commands,combatBuild}):buildReplayActionCandidate({index:sealedIndex,actionIndex:0,hitIndex:first.hitIndex,skills,commands,monsters,awakeners,critRoll,preOutcome:true,combatBuild});
        if(candidate.status!=='CALCULATED_REGRESSION_CANDIDATE'||!candidate.calculation||candidate.comparison!==null||candidate.observedHit!==null)throw new Error(candidate.calculationBlocker??'Deterministic outcome-free calculation required');
        return {
          schemaVersion:1,kind:'MORIMENS_BLIND_REPLAY_PREDICTION',build:candidate.build,
          selectionPolicy:critRoll===null?'first complete deterministic ordinary Active or Fixed direct hit using identity-only target/caster/skill routing with all numeric outcome fields excluded':'first complete ordinary Active or Fixed direct hit conditional on an explicit hypothetical critical roll, using identity-only target/caster/skill routing with all numeric outcome fields excluded',
          sourceActionIndex:sourceAction.actionIndex,sourceHitIndex:first.hitIndex,
          scenario:candidate.scenario,calculation:candidate.calculation,predictedDamage:candidate.calculation.preHitDamage,
          routing:{damageType,skillId:played.tid,commandId:candidate.identities.commandId,rowId:candidate.identities.rowId,eligibleRowIds:candidate.routing.eligibleRowIds??[candidate.identities.rowId],eligibleRowPredictions:candidate.routing.eligibleRowPredictions??[candidate.calculation.preHitDamage],parameters:candidate.routing.parameters,tags:candidate.routing.tags,repetitionPerExecution:candidate.repetition.perExecution,targetBindingSource:candidate.routing.targetBindingSource,commandSourceShape:candidate.routing.commandSourceShape},
          identityCommitmentSha256:hash({cardUid:played.uid,skillId:played.tid,casterUid:caster.uid,targetUid:target.uid}),
          sealedProjectionSha256:hash({action,scenario:candidate.scenario,routing:candidate.routing}),
          blockersBeforeSelection:blockers,
          unresolvedDependencies:['Target selection is treated as a frozen identity input rather than predicted',...(critRoll===null?[]:['The supplied critical roll is hypothetical; the actual RNG draw is unknown and this is not an exact blind prediction']),...candidate.unresolvedDependencies]
        };
      }catch(error){blockers.push({actionIndex:sourceAction.actionIndex,hitIndex:direct.snapshot.hitIndex,reason:error.message});}
    }
  }
  throw new Error(`No blind deterministic replay candidate: ${JSON.stringify(blockers)}`);
}
