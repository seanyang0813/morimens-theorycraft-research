import {resolvePveCardResources} from './card-use-resources.mjs';
import {snapshot} from './experiments.mjs';
const build='pc-res144-build51';

// Resource projection for distinct supplied card instances, not a full battle.
export function runCardResourceTimeline(value){
  const input=snapshot(value);
  if(!input||input.schemaVersion!==1||input.kind!=='morimens-card-resource-timeline'||input.build!==build||input.interveningEffects!=='assumed-absent'||Object.keys(input).some(k=>!['schemaVersion','kind','build','interveningEffects','initialEnergy','steps'].includes(k)))throw new Error('Explicit supported resource timeline required');
  if(!Number.isFinite(input.initialEnergy)||input.initialEnergy<0||input.initialEnergy>99||!Array.isArray(input.steps)||!input.steps.length)throw new Error('Initial energy in 0..99 and a nonempty sequence required');
  const ids=new Set(),cards=new Set();
  for(const step of input.steps){
    if(!step||typeof step.id!=='string'||!step.id||ids.has(step.id)||typeof step.cardInstanceId!=='string'||!step.cardInstanceId||cards.has(step.cardInstanceId)||Object.keys(step).some(k=>!['id','cardInstanceId','costInput','conditions'].includes(k)))throw new Error('Unique action and card-instance IDs required; repeated card availability is not modeled');
    ids.add(step.id);cards.add(step.cardInstanceId);
    if(!step.costInput||Object.hasOwn(step.costInput,'energy'))throw new Error('Energy must come from the preceding step, not a per-card reset');
    // Validate even steps beyond a later rejected play.
    resolvePveCardResources({costInput:{...step.costInput,energy:input.initialEnergy},conditions:step.conditions});
  }
  let energy=input.initialEnergy,stop=null;const trace=[],unresolved=new Set();
  for(const step of input.steps){
    const result=resolvePveCardResources({costInput:{...step.costInput,energy},conditions:step.conditions});
    for(const dependency of result.unresolvedDependencies)unresolved.add(dependency);
    trace.push({stepId:step.id,cardInstanceId:step.cardInstanceId,energyBefore:energy,energyAfter:result.energyAfter,result});
    if(!result.check.allowed){stop={stepId:step.id,gate:result.check.gate,reasonCode:result.check.reasonCode};break;}
    energy=result.energyAfter;
  }
  return {schemaVersion:1,status:'EXPERIMENTAL',build,scope:'Normal non-keeper PvE resource projection; supplied conditions and no intervening effects',finalDamage:null,
    initialEnergy:input.initialEnergy,energyAfter:energy,modeledEnergyLost:input.initialEnergy-energy,completed:stop===null,stop,acceptedSteps:trace.filter(t=>t.result.check.allowed).length,unattemptedSteps:input.steps.length-trace.length,trace,
    unresolvedDependencies:[...unresolved,'No automatic refunds, draws, cost changes, reactive effects, turn transitions or action damage','Hand membership and state conditions are supplied for each distinct card instance, not reconstructed']};
}
