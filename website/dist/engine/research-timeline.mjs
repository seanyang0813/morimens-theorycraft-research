import {runResolvedHitTimeline} from './resolved-hit-timeline.mjs';
import {runOldEmbersHitTimeline} from './old-embers-hit-timeline.mjs';

// Shared human/agent entry point; no default scope or inferred reactive effects.
export function runResearchTimeline(input){
  if(input?.interveningEffects==='assumed-absent')return runResolvedHitTimeline(input);
  if(input?.interveningEffects==='old-embers-only-assumed')return runOldEmbersHitTimeline(input);
  throw new Error('Choose an explicit supported interveningEffects scope');
}
