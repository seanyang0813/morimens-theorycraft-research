import {resolveCardCost} from './card-cost.mjs';
import {checkPveCardPlay} from './card-play-check.mjs';
import {planCardPayment} from './card-payment-plan.mjs';
import {consumeEnergy} from './energy-payment.mjs';

// Composed normal non-keeper PvE resource step; does not execute a card command.
export function resolvePveCardResources({costInput,conditions}){
  if(!costInput||costInput.pvp!==false||costInput.keeper!==false||costInput.energy>99)throw new Error('Normal non-keeper PvE resource scope required');
  if(!conditions||Object.hasOwn(conditions,'variable')||Object.hasOwn(conditions,'energyEnough'))throw new Error('Variable cost and affordability are derived from the cost input');
  const cost=resolveCardCost(costInput),energyEnough=cost.useCost<=costInput.energy;
  const check=checkPveCardPlay({...conditions,variable:cost.trace.variable,energyEnough});
  const effectiveAllowance=check.resetAllowIgnoreCost?false:conditions.allowIgnoreCost;
  const plan=check.allowed?planCardPayment({cfgCost:costInput.cfgCost,cost:cost.useCost,energy:costInput.energy,forceMode:null,attached:false,allowIgnoreCost:effectiveAllowance,energyEnough}):null;
  const payment=plan?.consumeRequest!==null&&plan!==null?consumeEnergy({energy:costInput.energy,request:plan.consumeRequest}):null;
  return {status:'EXPERIMENTAL',cost,check,plan,payment,energyBefore:costInput.energy,energyAfter:payment?.energyAfter??costInput.energy,allowIgnoreCostAfter:effectiveAllowance,
    unresolvedDependencies:['Component composition; not a connected original check-to-payment execution','No turn gates, card command, target validation, deck mutation or event listeners','Properties and cost modifiers supplied','Independent gameplay validation']};
}
