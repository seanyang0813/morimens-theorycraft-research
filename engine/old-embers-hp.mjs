import {oldEmbersCommand} from './old-embers.mjs';
import {resolveHpAttributeLoss} from './hp-attribute-loss.mjs';

// Resolve just the HP-effect stage, retaining later stack operations as a plan.
// A listener may change state before those later command operations execute.
// This snapshot bridge assumes clear initial branch markers and no earlier
// command-row state changes; it is not a substitute for the live step iterator.
export function resolveOldEmbersHp(input){
  const {hp,...commandInputs}=input??{};
  if(!Number.isFinite(hp)||hp<0)throw new Error('Explicit nonnegative current HP required');
  if(Object.hasOwn(commandInputs,'targetHpIsZero'))throw new Error('HP-zero state is derived from current HP');
  const command=oldEmbersCommand({...commandInputs,targetHpIsZero:hp===0});
  let hpEffect=null;
  if(command.triggerAmount!==null){
    // Keep the raw signed expression: applying the already-capped request
    // through ceil again would incorrectly round fractional HP limits.
    hpEffect=resolveHpAttributeLoss({hp,rawValue:-3*Math.min(command.triggerAmount,commandInputs.remainingStacks),immunity:commandInputs.immueChangeHp,limit:commandInputs.beChangeHpLimit});
  }
  return {status:'EXPERIMENTAL',finalDamage:null,hpAfter:hpEffect?.result.hpAfter??hp,modeledHpLost:hp-(hpEffect?.result.hpAfter??hp),command,hpEffect,limitations:['Explicit event eligibility and current state; no gameplay validation','HP callbacks and damage events are recorded, not dispatched','Stack consumption is a later command plan, not committed state','Death effects and statistics attribution are not executed']};
}
