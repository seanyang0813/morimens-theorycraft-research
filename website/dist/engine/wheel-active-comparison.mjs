import {snapshot,changes} from './experiments.mjs';
import {runWheelActiveTimeline} from './wheel-active-timeline.mjs';

const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const wheelValue=(state,group,property)=>state?.[group]?.[property]??null;
const counterValue=(state,wheelId)=>state?.arachne?.wheels.find(row=>row.wheelId===wheelId)?.triggersUsed??null;

function metrics(row){
  if(!row)return null;
  const before=row.before.wheelState,after=row.after.wheelState;
  return {
    type:row.type,
    preHitDamage:row.type==='ACTIVE_HIT'?row.result.preHitDamage:null,
    modeledHpLost:row.type==='ACTIVE_HIT'?row.result.modeledHpLost:null,
    hpBefore:row.before.target.hp,
    hpAfter:row.after.target.hp,
    blockBefore:row.before.target.block,
    blockAfter:row.after.target.block,
    strikeFlatBefore:wheelValue(before,'doomsday','strikecardDamagePlus'),
    strikeFlatAfter:wheelValue(after,'doomsday','strikecardDamagePlus'),
    teamAmplificationBefore:wheelValue(before,'arachne','basicDamagePer'),
    teamAmplificationAfter:wheelValue(after,'arachne','basicDamagePer'),
    doomsdayTriggersBefore:wheelValue(before,'doomsday','counter'),
    doomsdayTriggersAfter:wheelValue(after,'doomsday','counter'),
    eternalTriggersBefore:counterValue(before,'wheel-0128'),
    eternalTriggersAfter:counterValue(after,'wheel-0128'),
    rotaTriggersBefore:counterValue(before,'wheel-0132'),
    rotaTriggersAfter:counterValue(after,'wheel-0132'),
  };
}

function numericDelta(a,b){
  const result={};for(const key of Object.keys(a))if(key!=='type')result[key]=a[key]===null||b[key]===null?null:b[key]-a[key];return result;
}

export function compareWheelActiveTimelines(value,{runtimeFingerprint=null}={}){
  const experiment=snapshot(value),allowed=['schemaVersion','kind','baseline','candidate','runtimeFingerprint'];
  if(!experiment||experiment.schemaVersion!==1||experiment.kind!=='morimens-wheel-active-comparison'||Object.keys(experiment).some(key=>!allowed.includes(key))||!Object.hasOwn(experiment,'baseline')||!Object.hasOwn(experiment,'candidate'))throw new Error('Expected an exact version 1 Wheel Active comparison');
  if(runtimeFingerprint!==null&&!hash(runtimeFingerprint))throw new Error('Invalid runtime fingerprint');
  if(Object.hasOwn(experiment,'runtimeFingerprint')&&(!hash(experiment.runtimeFingerprint)||experiment.runtimeFingerprint!==runtimeFingerprint))throw new Error('Runtime fingerprint mismatch or current runtime not verified; replay refused');
  if(runtimeFingerprint!==null)experiment.runtimeFingerprint=runtimeFingerprint;
  const baseline=runWheelActiveTimeline(experiment.baseline),candidate=runWheelActiveTimeline(experiment.candidate);
  const normalize=timeline=>({...timeline,steps:Object.fromEntries(timeline.steps.map(step=>[step.id,step]))});
  const inputChanges=changes(normalize(experiment.baseline),normalize(experiment.candidate));
  const order=key=>experiment[key].steps.map(step=>step.id),baselineOrder=order('baseline'),candidateOrder=order('candidate');
  const orderChanged=JSON.stringify(baselineOrder)!==JSON.stringify(candidateOrder);
  const a=new Map(baseline.trace.map(row=>[row.id,row])),b=new Map(candidate.trace.map(row=>[row.id,row]));
  const alignedSteps=[...new Set([...baselineOrder,...candidateOrder])].map(id=>{
    const av=metrics(a.get(id)),bv=metrics(b.get(id));
    return {id,baselinePosition:baselineOrder.includes(id)?baselineOrder.indexOf(id)+1:null,candidatePosition:candidateOrder.includes(id)?candidateOrder.indexOf(id)+1:null,baseline:av,candidate:bv,delta:av&&bv&&av.type===bv.type?numericDelta(av,bv):null};
  });
  const complete=baseline.completed&&candidate.completed;
  return {schemaVersion:1,kind:'morimens-wheel-active-comparison-result',analysisTrack:'theorycrafting',status:'EXPERIMENTAL_COMPARISON',finalDamage:null,experiment,reproducibility:runtimeFingerprint===null?'UNPINNED':'RUNTIME_PINNED',orderChanged,orderOnly:orderChanged&&inputChanges.length===0,inputChanges,alignedSteps,completeComparison:complete,modeledHpLostDelta:complete?candidate.modeledHpLost-baseline.modeledHpLost:null,interpretation:'Steps align by stable ID. Numeric deltas compare the two executions and expose changed hit, HP, Block, Wheel-property and counter state; they do not isolate one cause when multiple inputs or positions change.',unresolvedDependencies:[...new Set([...baseline.unresolvedDependencies,...candidate.unresolvedDependencies])],baseline,candidate};
}
