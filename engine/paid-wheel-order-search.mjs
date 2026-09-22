import {snapshot} from './experiments.mjs';
import {runPaidWheelActiveTimeline} from './paid-wheel-active-timeline.mjs';

const factorial=n=>{let value=1;for(let i=2;i<=n;i++)value*=i;return value;};
const orderKey=actions=>actions.map(action=>action.id).join('\u0000');
const compareKey=(a,b)=>a<b?-1:a>b?1:0;

function *permutations(rows,start=0){
  if(start===rows.length){yield rows.slice();return;}
  for(let i=start;i<rows.length;i++){
    [rows[start],rows[i]]=[rows[i],rows[start]];
    yield *permutations(rows,start+1);
    [rows[start],rows[i]]=[rows[i],rows[start]];
  }
}

export function searchPaidWheelOrders(value){
  const input=snapshot(value),keys=['schemaVersion','kind','objective','timeline','maxEvaluations','returnTop'];
  if(!input||input.schemaVersion!==1||input.kind!=='morimens-paid-wheel-order-search'||Object.keys(input).some(key=>!keys.includes(key))||keys.some(key=>!Object.hasOwn(input,key)))throw new Error('Expected an exact version 1 paid Wheel order search');
  if(input.objective!=='MAX_MODELED_HP_LOST')throw new Error('Unsupported search objective');
  if(!Number.isSafeInteger(input.maxEvaluations)||input.maxEvaluations<1||input.maxEvaluations>10000)throw new Error('maxEvaluations must be an integer from 1 through 10000');
  if(!Number.isSafeInteger(input.returnTop)||input.returnTop<1||input.returnTop>20)throw new Error('returnTop must be an integer from 1 through 20');
  if(!input.timeline||!Array.isArray(input.timeline.actions)||input.timeline.actions.length<1)throw new Error('A nonempty paid Wheel Active timeline is required');
  const ids=input.timeline.actions.map(action=>action?.id);if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length)throw new Error('Search requires unique nonempty action IDs');
  const count=factorial(input.timeline.actions.length);if(count>input.maxEvaluations)throw new Error(`Exact search needs ${count} evaluations, above maxEvaluations ${input.maxEvaluations}`);
  runPaidWheelActiveTimeline(input.timeline); // validates every action and effect suffix before enumeration
  const eligible=[],incomplete=[];
  for(const actions of permutations(input.timeline.actions.slice())){
    const timeline={...input.timeline,actions},result=runPaidWheelActiveTimeline(timeline),terminalStatus=result.completed?'COMPLETE':result.targetAfter.hp<=0?'TARGET_DEFEATED':'INCOMPLETE',summary={order:actions.map(action=>action.id),modeledHpLost:result.modeledHpLost,energyAfter:result.energyAfter,acceptedActions:result.acceptedActions,completed:result.completed,terminalStatus,stop:result.stop};
    if(terminalStatus!=='INCOMPLETE')eligible.push({...summary,timeline,result});else incomplete.push(summary);
  }
  eligible.sort((a,b)=>b.modeledHpLost-a.modeledHpLost||compareKey(orderKey(a.timeline.actions),orderKey(b.timeline.actions)));
  incomplete.sort((a,b)=>b.modeledHpLost-a.modeledHpLost||compareKey(a.order.join('\u0000'),b.order.join('\u0000')));
  const best=eligible[0]??null,dependencies=new Set(best?.result.unresolvedDependencies??[]);
  dependencies.add('Optimality applies only to every permutation of the supplied explicit paid Wheel-aware actions under this experimental runner');
  dependencies.add('The search does not choose builds, cards, draws, targets, hit snapshots, generated pursuits or unsupported mechanics');
  return {schemaVersion:1,kind:'morimens-paid-wheel-order-search-result',analysisTrack:'theorycrafting',status:'EXPERIMENTAL_SEARCH',objective:input.objective,optimalWithinEnumeratedSet:best!==null,evaluatedPermutations:count,eligiblePermutations:eligible.length,completePermutations:eligible.filter(row=>row.terminalStatus==='COMPLETE').length,lethalPermutations:eligible.filter(row=>row.terminalStatus==='TARGET_DEFEATED').length,incompletePermutations:incomplete.length,best,topEligible:eligible.slice(0,input.returnTop).map(({timeline,result,...row})=>row),topIncomplete:incomplete.slice(0,input.returnTop),finalDamage:null,unresolvedDependencies:[...dependencies]};
}
