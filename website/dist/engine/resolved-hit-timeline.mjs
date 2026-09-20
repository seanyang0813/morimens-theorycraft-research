import {calculateDamage,build} from './calculate-damage.mjs';

// A composed research model of resolved hits, not a card/battle simulator.
export function runResolvedHitTimeline(input){
  if(!input||input.schemaVersion!==1||input.build!==build||input.interveningEffects!=='assumed-absent'||Object.keys(input).some(k=>!['schemaVersion','build','interveningEffects','target','steps'].includes(k)))throw new Error('Explicit resolved-hit timeline and assumed-absent intervening effects required');
  if(!input.target||Object.keys(input.target).some(k=>!['hp','block'].includes(k))||!Number.isFinite(input.target.hp)||input.target.hp<=0||!Number.isFinite(input.target.block)||input.target.block<0)throw new Error('Explicit living target HP and shield required');
  if(!Array.isArray(input.steps)||!input.steps.length)throw new Error('Nonempty hit timeline required');
  const ids=new Set();
  for(const step of input.steps){
    if(!step||typeof step.id!=='string'||!step.id||ids.has(step.id)||Object.keys(step).some(k=>!['id','scenario','immune','puncture'].includes(k)))throw new Error('Each hit needs a unique ID and supported fields');ids.add(step.id);
    if(typeof step.immune!=='boolean'||typeof step.puncture!=='boolean')throw new Error('Explicit immunity and puncture decisions required');
    if(!step.scenario||step.scenario.build!==build||step.scenario.mode!=='experimental'||Object.hasOwn(step.scenario,'hitResolution'))throw new Error('Explicit experimental scenario without independently supplied hit state required');
    // Validate every formula, including later steps that may not execute.
    calculateDamage(step.scenario);
  }
  let state={...input.target};const trace=[],unresolved=new Set([
    'Intervening state effects, triggers and callbacks are assumed absent, not reconstructed',
    'No cards, costs, draws, action legality, turn boundaries or automatic pursuits are simulated',
    'Retain-HP, hit limits and death resistance are excluded from this experimental scope',
    'Independent gameplay validation',
  ]);
  let stop=null;
  for(const step of input.steps){
    if(state.hp<=0){stop={beforeStepId:step.id,reason:'Death handling is required before another hit can be evaluated'};break;}
    const before={...state};
    const result=calculateDamage({...step.scenario,hitResolution:{...before,immune:step.immune,puncture:step.puncture,preventEligible:false,retainHp:0,limit:0,usedLimit:0,deathResist:0}});
    result.unresolvedDependencies.forEach(x=>unresolved.add(x));
    const hp=result.experimentalModels.find(m=>m.name==='Ordinary HP subtraction');
    if(!hp){stop={beforeStepId:step.id,reason:'This step has no supported ordinary HP transition'};break;}
    state={hp:hp.hpAfter,block:hp.shieldAfter};
    trace.push({stepId:step.id,before,after:{...state},modeledHpLost:hp.modeledHpLost,result});
  }
  return {schemaVersion:1,status:'EXPERIMENTAL',build,finalDamage:null,scope:'Resolved hit arithmetic with shared HP/shield; intervening effects assumed absent',
    completed:stop===null,stop,executedSteps:trace.length,remainingSteps:input.steps.length-trace.length,
    initialTarget:{...input.target},targetAfter:state,modeledHpLost:input.target.hp-state.hp,trace,unresolvedDependencies:[...unresolved]};
}
