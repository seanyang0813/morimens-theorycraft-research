import {snapshot} from './experiments.mjs';
import {runCardActionTimeline} from './card-action-timeline.mjs';

const factorial=n=>{let value=1;for(let i=2;i<=n;i++)value*=i;return value;};
const orderKey=steps=>steps.map(step=>step.id).join('\u0000');
const compareKey=(a,b)=>a<b?-1:a>b?1:0;

function *permutations(rows,start=0){
  if(start===rows.length){yield rows.slice();return;}
  for(let i=start;i<rows.length;i++){
    [rows[start],rows[i]]=[rows[i],rows[start]];
    yield *permutations(rows,start+1);
    [rows[start],rows[i]]=[rows[i],rows[start]];
  }
}

export function searchCardOrders(value){
  const input=snapshot(value),keys=['schemaVersion','kind','objective','timeline','maxEvaluations','returnTop'];
  if(!input||input.schemaVersion!==1||input.kind!=='morimens-card-order-search'||Object.keys(input).some(key=>!keys.includes(key))||keys.some(key=>!Object.hasOwn(input,key)))throw new Error('Expected an exact version 1 card-order search');
  if(input.objective!=='MAX_MODELED_HP_LOST')throw new Error('Unsupported search objective');
  if(!Number.isSafeInteger(input.maxEvaluations)||input.maxEvaluations<1||input.maxEvaluations>10000)throw new Error('maxEvaluations must be an integer from 1 through 10000');
  if(!Number.isSafeInteger(input.returnTop)||input.returnTop<1||input.returnTop>20)throw new Error('returnTop must be an integer from 1 through 20');
  if(!input.timeline||!Array.isArray(input.timeline.steps)||input.timeline.steps.length<1)throw new Error('A nonempty card-action timeline is required');
  const ids=input.timeline.steps.map(step=>step?.id);
  if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length)throw new Error('Search requires unique nonempty action IDs');
  const count=factorial(input.timeline.steps.length);
  if(count>input.maxEvaluations)throw new Error(`Exact search needs ${count} evaluations, above maxEvaluations ${input.maxEvaluations}`);
  // Validate the original input before enumeration so invalid suffixes cannot hide
  // behind resource or lethal stops in every candidate.
  runCardActionTimeline(input.timeline);
  const eligible=[],incomplete=[];
  for(const steps of permutations(input.timeline.steps.slice())){
    const timeline={...input.timeline,steps},result=runCardActionTimeline(timeline),terminalStatus=result.completed?'COMPLETE':result.targetAfter.hp<=0?'TARGET_DEFEATED':'INCOMPLETE',summary={order:steps.map(step=>step.id),modeledHpLost:result.modeledHpLost,energyAfter:result.energyAfter,completed:result.completed,terminalStatus,stop:result.stop};
    if(terminalStatus!=='INCOMPLETE')eligible.push({...summary,timeline,result});else incomplete.push(summary);
  }
  eligible.sort((a,b)=>b.modeledHpLost-a.modeledHpLost||compareKey(orderKey(a.timeline.steps),orderKey(b.timeline.steps)));
  incomplete.sort((a,b)=>b.modeledHpLost-a.modeledHpLost||compareKey(a.order.join('\u0000'),b.order.join('\u0000')));
  const best=eligible[0]??null,dependencies=new Set(best?.result.unresolvedDependencies??[]);
  dependencies.add('Optimality applies only to all permutations of the supplied resolved actions under this experimental runner');
  dependencies.add('Missing cards, draws, refunds, triggered effects, turn transitions and unsupported legality cannot be optimized');
  return {schemaVersion:1,kind:'morimens-card-order-search-result',status:'EXPERIMENTAL',objective:input.objective,optimalWithinEnumeratedSet:best!==null,evaluatedPermutations:count,eligiblePermutations:eligible.length,completePermutations:eligible.filter(row=>row.terminalStatus==='COMPLETE').length,lethalPermutations:eligible.filter(row=>row.terminalStatus==='TARGET_DEFEATED').length,incompletePermutations:incomplete.length,best,topEligible:eligible.slice(0,input.returnTop).map(({timeline,result,...row})=>row),topIncomplete:incomplete.slice(0,input.returnTop),finalDamage:null,unresolvedDependencies:[...dependencies]};
}
