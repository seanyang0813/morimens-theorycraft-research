import {searchPaidWheelOrders} from './paid-wheel-order-search.mjs';

// Uses the existing payment, damage and Wheel engine, with supplied property maps.
export function searchSimulationThreshold(input) {
  const keys = ['schemaVersion','kind','thresholdHpLost','maxEvaluations','candidates'];
  if (!input || input.schemaVersion !== 1 || input.kind !== 'morimens-simulation-threshold-search' || keys.some(key => !Object.hasOwn(input,key)) || Object.keys(input).some(key => !keys.includes(key))) throw new Error('Exact threshold search request required');
  if (!Number.isSafeInteger(input.thresholdHpLost) || input.thresholdHpLost < 1 || !Number.isSafeInteger(input.maxEvaluations) || input.maxEvaluations < 1 || input.maxEvaluations > 10000) throw new Error('Positive integer threshold and cap <= 10000 required');
  if (!Array.isArray(input.candidates) || input.candidates.length < 1 || input.candidates.length > 100) throw new Error('Supply 1–100 explicit candidates');
  const ids = new Set(); let evaluations = 0;
  for (const row of input.candidates) {
    if (!row || Object.keys(row).some(key => !['id','timeline'].includes(key)) || typeof row.id !== 'string' || !row.id || ids.has(row.id) || !Array.isArray(row.timeline?.actions) || !row.timeline.actions.length) throw new Error('Unique candidate IDs and explicit paid timelines required');
    ids.add(row.id); let count = 1;
    for (let i = 2; i <= row.timeline.actions.length; i++) {count *= i; if (count > input.maxEvaluations) throw new Error('Complete candidate/order search exceeds evaluation cap');}
    evaluations += count;
  }
  if (evaluations > input.maxEvaluations) throw new Error('Complete candidate/order search exceeds evaluation cap');
  const candidates = input.candidates.map(row => {
    const result = searchPaidWheelOrders({schemaVersion:1,kind:'morimens-paid-wheel-order-search',objective:'MAX_MODELED_HP_LOST',timeline:row.timeline,maxEvaluations:input.maxEvaluations,returnTop:1});
    return {id:row.id, passed:result.best !== null && result.best.modeledHpLost >= input.thresholdHpLost, modeledHpLost:result.best?.modeledHpLost ?? null, bestOrder:result.best?.order ?? null, eligiblePermutations:result.eligiblePermutations, result};
  });
  return {kind:'morimens-simulation-threshold-result',status:'EXPERIMENTAL_EXHAUSTIVE_THRESHOLD_SEARCH',analysisTrack:'theorycrafting', thresholdHpLost:input.thresholdHpLost, evaluatedPermutations:evaluations, passingCandidateIds:candidates.filter(row => row.passed).map(row => row.id), candidates,
    finalDamage:null, gameplayClear:null, limitations:[
      'Threshold pass refers only to modeled HP loss under supplied paid timelines and complete property maps.',
      'Enumerates every order of every supplied candidate; no continuous/global build optimum or minimum account investment follows.',
      'Pursuit events, available cards, complete snapshots, legal initial hands and all unmodeled mechanics remain explicit inputs.',
      'Community upgrade labels are not automatically converted to battle properties.'
    ]};
}
