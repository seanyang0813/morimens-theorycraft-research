import {runPreparedStateActiveChain} from './prepared-state-active-chain.mjs';
import {runCardResourceTimeline} from './card-resource-timeline.mjs';
import {resolvePveCardResources} from './card-use-resources.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const clone=value=>JSON.parse(JSON.stringify(value));

// Pays distinct ordinary PvE card instances in action order and exposes effects
// only for accepted plays. The resource timeline prevalidates the complete list.
export function runPaidPreparedStateActiveChain(value,source){
  const input=clone(value);
  if(!exact(input,['schemaVersion','kind','build','initialEnergy','chain','resourceSteps'])||input.schemaVersion!==1||input.kind!=='morimens-paid-prepared-state-active-chain'||input.chain?.build!==input.build||!Array.isArray(input.resourceSteps)||input.resourceSteps.length!==1+(input.chain?.activeSkills?.length??-1))throw new Error('Exact paid prepared chain with one resource step per card required');
  const resourceInput={schemaVersion:1,kind:'morimens-card-resource-timeline',build:input.build,interveningEffects:'assumed-absent',initialEnergy:input.initialEnergy,steps:input.resourceSteps};
  runCardResourceTimeline(resourceInput); // validates every suffix and identity
  const calculated=runPreparedStateActiveChain(input.chain,source); // validates every effect template
  let energy=input.initialEnergy,target=clone(input.chain.activeSkills[0].snapshot.initialTargetProperties),stateCard=null,carry=null,stop=null;
  const trace=[],activeSkills=[],transitions=[];
  const pay=(step,index,kind)=>{
    const resources=resolvePveCardResources({costInput:{...step.costInput,energy},conditions:step.conditions});
    const row={index,kind,stepId:step.id,cardInstanceId:step.cardInstanceId,energyBefore:energy,energyAfter:resources.energyAfter,resources,effect:null};trace.push(row);
    if(!resources.check.allowed){stop={index,kind,phase:'play-check',stepId:step.id,gate:resources.check.gate,reasonCode:resources.check.reasonCode};return null;}
    energy=resources.energyAfter;return row;
  };

  const statePayment=pay(input.resourceSteps[0],0,'state-card');
  if(statePayment){stateCard=calculated.stateCard;carry=calculated.carry;statePayment.effect={status:stateCard.status,skillId:stateCard.skillId,commandId:stateCard.prepared.commandId};}
  for(let index=0;statePayment&&!stop&&index<calculated.activeSkills.length;index++){
    const payment=pay(input.resourceSteps[index+1],index+1,'active-card');if(!payment)break;
    const effect=calculated.activeSkills[index],transition=calculated.transitions[index];activeSkills.push(effect);transitions.push(transition);target={...effect.calculation.targetAfter};
    payment.effect={status:effect.status,skillId:effect.skillId,commandId:effect.prepared.commandId,modeledHpLost:effect.calculation.modeledHpLost,targetAfter:{...target},transition};
    if(!effect.completed||target.hp<=0){stop={index:index+1,kind:'active-card',phase:'effects',stepId:input.resourceSteps[index+1].id,detail:effect.stop??'Death handling required before another card'};break;}
  }
  const acceptedCards=trace.filter(row=>row.resources.check.allowed).length;
  return {schemaVersion:1,kind:'morimens-paid-prepared-state-active-chain-result',analysisTrack:'theorycrafting',status:'EXPERIMENTAL',build:input.build,finalDamage:null,completed:stop===null&&activeSkills.length===input.chain.activeSkills.length,stop,initialEnergy:input.initialEnergy,energyAfter:energy,modeledEnergyLost:input.initialEnergy-energy,acceptedCards,unattemptedCards:input.resourceSteps.length-trace.length,stateCard,carry,activeSkills,transitions,targetRoleId:input.chain.targetRoleId,initialTarget:clone(input.chain.activeSkills[0].snapshot.initialTargetProperties),targetAfter:target,modeledHpLost:input.chain.activeSkills[0].snapshot.initialTargetProperties.hp-target.hp,trace,
    unresolvedDependencies:['Ordinary non-keeper PvE cost, legality and payment execute before each exposed catalog-backed effect','Every resource and effect suffix is prevalidated, but the joined payment-to-command path is authored composition','Hand membership and status conditions are supplied per distinct card instance; hand removal, draws, refunds, cost changes and turn gates are not simulated','Card lifecycle callbacks, retargeting, reactive effects, death execution and gameplay validation remain unresolved']};
}
