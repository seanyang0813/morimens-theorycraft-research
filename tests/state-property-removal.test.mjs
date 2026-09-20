import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {statePropertyRemoval} from '../engine/state-property-removal.mjs';
const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-state-property-removal.json',import.meta.url)));
test('removal reverses stored signed contributions through original ban/team routing',()=>{
  for(const {input:i,expected} of evidence.fixtures){
    const r=statePropertyRemoval({property:i.property,storedValue:i.storedValue,apiType:i.property==='strikecard_damage_plus'?'AWAKER_ATTR':'OTHER',pve:i.pve,playerOwner:i.playerOwner,banned:i.banned,ignoreBan:i.ignoreBan,owner:'owner',awakeners:['awaker-0','awaker-1']});
    assert.deepEqual(r.mutations,expected.mutations);assert.equal(r.storedValueAfter,expected.storedValueAfter);
  }
});
