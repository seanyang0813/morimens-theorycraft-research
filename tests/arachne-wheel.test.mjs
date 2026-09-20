import assert from 'node:assert/strict';
import {arachneWheelAfterPursuit} from '../engine/arachne-wheel.mjs';
// Synthetic eligibility checks against the recovered owner comparison and cap.
let state={ownerUid:2,pursuitOwnerUid:1,triggersUsed:0,amplificationPercent:150};
assert.equal(arachneWheelAfterPursuit(state).addedAmplification,0);
for(let i=0;i<6;i++){
  const out=arachneWheelAfterPursuit({...state,pursuitOwnerUid:2});
  assert.equal(out.addedAmplification,i<5?40:0);
  state={...state,...out};
}
assert.equal(state.triggersUsed,5);assert.equal(state.amplificationPercent,350);
