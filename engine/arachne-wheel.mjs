// State 134231 / Cmd 134385 / State 70350. Does not create pursuits.
export function arachneWheelAfterPursuit({ownerUid,pursuitOwnerUid,triggersUsed,amplificationPercent}){
  if(!Number.isSafeInteger(ownerUid)||!Number.isSafeInteger(pursuitOwnerUid)||!Number.isSafeInteger(triggersUsed)||triggersUsed<0||triggersUsed>5||!Number.isFinite(amplificationPercent))throw new Error('Explicit pursuit owner, counter and team amplification required');
  const eligible=ownerUid===pursuitOwnerUid&&triggersUsed<5;
  return {eligible,triggersUsed:triggersUsed+(eligible?1:0),amplificationPercent:amplificationPercent+(eligible?40:0),addedAmplification:eligible?40:0};
}
