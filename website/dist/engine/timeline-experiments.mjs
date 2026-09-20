import {snapshot,changes} from './experiments.mjs';
import {runResearchTimeline} from './research-timeline.mjs';

export function compareTimelines(input,{runtimeFingerprint=null}={}){
  const experiment=snapshot(input);
  if(!experiment||experiment.schemaVersion!==1||experiment.kind!=='morimens-timeline-comparison'||Object.keys(experiment).some(k=>!['schemaVersion','kind','baseline','candidate','runtimeFingerprint'].includes(k)))throw new Error('Expected a versioned morimens-timeline-comparison');
  const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
  if(runtimeFingerprint!==null&&!hash(runtimeFingerprint))throw new Error('Invalid runtime fingerprint');
  if(Object.hasOwn(experiment,'runtimeFingerprint')&&(!hash(experiment.runtimeFingerprint)||experiment.runtimeFingerprint!==runtimeFingerprint))throw new Error('Runtime fingerprint mismatch or current runtime not verified; replay refused');
  if(runtimeFingerprint!==null)experiment.runtimeFingerprint=runtimeFingerprint;
  const baseline=runResearchTimeline(experiment.baseline),candidate=runResearchTimeline(experiment.candidate);
  const normalize=timeline=>({...timeline,steps:Object.fromEntries(timeline.steps.map(step=>[step.id,step]))});
  const inputChanges=changes(normalize(experiment.baseline),normalize(experiment.candidate));
  const order=key=>experiment[key].steps.map(s=>s.id),orderChanged=JSON.stringify(order('baseline'))!==JSON.stringify(order('candidate'));
  const a=new Map(baseline.trace.map(t=>[t.stepId,t])),b=new Map(candidate.trace.map(t=>[t.stepId,t]));
  const measure=t=>t?{hpLost:t.before.hp-t.after.hp,directHpLost:t.hit?.modeledHpLost??t.modeledHpLost,generatedHpLost:t.hit?t.hit.after.hp-t.after.hp:0,hpBefore:t.before.hp,hpAfter:t.after.hp,shieldBefore:t.before.block,shieldAfter:t.after.block}:null;
  const alignedSteps=[...new Set([...order('baseline'),...order('candidate')])].map(id=>{
    const av=measure(a.get(id)),bv=measure(b.get(id));
    return {id,baselinePosition:order('baseline').includes(id)?order('baseline').indexOf(id)+1:null,candidatePosition:order('candidate').includes(id)?order('candidate').indexOf(id)+1:null,baseline:av,candidate:bv,delta:av&&bv?Object.fromEntries(Object.keys(av).map(k=>[k,bv[k]-av[k]])):null};
  });
  const complete=baseline.completed&&candidate.completed;
  return {schemaVersion:1,status:'EXPERIMENTAL',finalDamage:null,experiment,reproducibility:runtimeFingerprint===null?'UNPINNED':'RUNTIME_PINNED',
    orderChanged,orderOnly:orderChanged&&inputChanges.length===0,inputChanges,alignedSteps,
    completeComparison:complete,modeledHpLostDelta:complete?candidate.modeledHpLost-baseline.modeledHpLost:null,
    interpretation:'Steps align by supplied identity. Deltas describe the two executions, not isolated causal contributions. Unexecuted steps have null metrics. Incomplete sequences have no full-sequence damage delta.',
    unresolvedDependencies:[...new Set([...baseline.unresolvedDependencies,...candidate.unresolvedDependencies])],baseline,candidate};
}
