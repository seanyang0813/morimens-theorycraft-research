import {calculateDamage} from './calculate-damage.mjs';
import {runResearchTimeline} from './research-timeline.mjs';
import {runCardActionTimeline} from './card-action-timeline.mjs';
import {runOrderedStateCommand} from './ordered-state-command.mjs';
import {calculateSnapshotActiveDamage} from './battle-property-snapshot-damage.mjs';

const metrics=new Set(['preHitDamage','modeledHpLost']);
export function runObservationScenario(scenario,metric){
  if(!metrics.has(metric))throw new Error('Metric must be preHitDamage or modeledHpLost');
  if(!scenario||typeof scenario!=='object'||Array.isArray(scenario))throw new Error('Explicit observation scenario required');
  if(scenario.mode==='experimental'){
    const result=calculateDamage(scenario),models=result.experimentalModels.filter(model=>Object.hasOwn(model,metric));
    if(models.length!==1||!Number.isFinite(models[0][metric]))throw new Error('Requested metric is unavailable or ambiguous');
    return {build:scenario.build,scenarioKind:'single-hit',metric,value:models[0][metric],scope:models[0].scope,unresolvedDependencies:result.unresolvedDependencies};
  }
  if(scenario.kind==='morimens-battle-property-snapshot-damage'){
    const result=calculateSnapshotActiveDamage(scenario);
    const value=metric==='preHitDamage'?result.preHitDamage:result.modeledHpLost;
    if(!Number.isFinite(value))throw new Error('Requested metric is unavailable for this scenario shape');
    return {build:result.build,scenarioKind:scenario.kind,metric,value,scope:result.scope,unresolvedDependencies:result.unresolvedDependencies};
  }
  let result,scenarioKind;
  if(scenario.kind==='morimens-card-action-timeline'){result=runCardActionTimeline(scenario);scenarioKind=scenario.kind;}
  else if(scenario.kind==='morimens-ordered-state-command'){result=runOrderedStateCommand(scenario);scenarioKind=scenario.kind;}
  else if(scenario.schemaVersion===1&&Array.isArray(scenario.steps)&&scenario.target&&['assumed-absent','old-embers-only-assumed'].includes(scenario.interveningEffects)){result=runResearchTimeline(scenario);scenarioKind=scenario.interveningEffects==='old-embers-only-assumed'?'old-embers-hit-timeline':'resolved-hit-timeline';}
  else throw new Error('Unsupported observation scenario shape');
  if(result.status!=='EXPERIMENTAL'||result.completed!==true)throw new Error('Observation scenario did not complete in the supported scope');
  if(metric!=='modeledHpLost'||!Number.isFinite(result.modeledHpLost))throw new Error('Requested metric is unavailable for this scenario shape');
  return {build:result.build,scenarioKind,metric,value:result.modeledHpLost,scope:result.scope??`Completed ${scenarioKind} modeled HP loss`,unresolvedDependencies:result.unresolvedDependencies};
}
