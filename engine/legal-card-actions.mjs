import {snapshot} from './experiments.mjs';
import {checkPvePlayDispatch} from './command-gate.mjs';
import {resolvePveCardResources} from './card-use-resources.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));

// Enumerates ordinary non-keeper PvE cards from one explicit state snapshot.
// It does not select targets or mutate energy, hand, deck, or turn state.
export function enumerateLegalCardActions(value){
  const input=snapshot(value);
  if(!exact(input,['schemaVersion','kind','build','energy','dispatch','cards'])||input.schemaVersion!==1||input.kind!=='morimens-legal-card-actions')throw new Error('Expected an exact version 1 legal-card-actions input');
  if(typeof input.build!=='string'||!input.build)throw new Error('Explicit combat build required');
  if(!Number.isFinite(input.energy)||input.energy<0||input.energy>99)throw new Error('Energy must be finite from 0 through 99');
  if(!Array.isArray(input.cards))throw new Error('Explicit card list required');
  const dispatch=checkPvePlayDispatch(input.dispatch),seenIds=new Set(),seenInstances=new Set();
  const actions=input.cards.map((card,index)=>{
    if(!exact(card,['id','cardInstanceId','costInput','conditions'])||typeof card.id!=='string'||!card.id||typeof card.cardInstanceId!=='string'||!card.cardInstanceId)throw new Error(`Exact card identity and resource inputs required at index ${index}`);
    if(seenIds.has(card.id)||seenInstances.has(card.cardInstanceId))throw new Error('Card IDs and instance IDs must each be unique');
    seenIds.add(card.id);seenInstances.add(card.cardInstanceId);
    if(!card.costInput||Object.hasOwn(card.costInput,'energy'))throw new Error('Card cost input must not replace state energy');
    const resources=resolvePveCardResources({costInput:{...card.costInput,energy:input.energy},conditions:card.conditions});
    const available=dispatch.dispatch&&resources.check.allowed;
    return {id:card.id,cardInstanceId:card.cardInstanceId,available,globalGate:dispatch.gate,cardGate:resources.check.gate,reasonCode:resources.check.reasonCode,
      resolvedCost:resources.cost.useCost,variableCost:resources.cost.trace.variable,energyAfterIfPlayed:available?resources.energyAfter:null,paymentBranch:available?resources.plan.branch:null,
      allowIgnoreCostAfterIfPlayed:available?resources.allowIgnoreCostAfter:null};
  });
  return {schemaVersion:1,kind:'morimens-legal-card-actions-result',status:'EXPERIMENTAL',build:input.build,energy:input.energy,dispatch,actions,legalActionIds:actions.filter(row=>row.available).map(row=>row.id),finalDamage:null,
    scope:'Ordinary non-keeper PvE dispatch, hand/status and affordability checks over supplied card state; enumeration only',
    unresolvedDependencies:['Target legality and selection are not evaluated','Keeper, PvP, forced plays, per-turn Camp1 play limit, deck mutation and card effects are outside this operation','Card conditions and cost modifiers are supplied rather than assembled from a build','No independent gameplay validation']};
}
