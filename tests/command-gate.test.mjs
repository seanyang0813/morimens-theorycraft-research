import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkPvePlayDispatch} from '../engine/command-gate.mjs';
test('ordinary PvE dispatch gate matches original waiting/running/finished precedence',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-command-gate.json',import.meta.url)));
  for(const {input,expected} of evidence.fixtures){const r=checkPvePlayDispatch(input);assert.equal(r.dispatch,expected.reachedCardLookup);for(const key of ['waitingTimesAfter','robotWaitingCalled','timeoutFlags'])assert.deepEqual(r[key],expected[key]);}
});
