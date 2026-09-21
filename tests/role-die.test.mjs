import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const baseline=JSON.parse(readFileSync(new URL('./synthetic/original-role-die.json',import.meta.url)));
const current=JSON.parse(readFileSync(new URL('../research/evidence/pc-res150-death-path-runtime.json',import.meta.url)));

test('original role-death branches preserve revival, confirmation and death routing',()=>{
  assert.equal(baseline.monsterPreCheckDeathEvent,true);
  assert.equal(baseline.fixtures.length,7);
  assert.deepEqual(baseline.fixtures.find(row=>row.input.name==='monster-dies').expected.trace,[{event:'RoleDie',castRoleUid:9,sourceCardUid:10,cmdServerUid:11}]);
  assert.deepEqual(baseline.fixtures.find(row=>row.input.name==='player-can-respawn').expected,{returnValue:'yield',trace:['Confirm','Yield']});
  assert.deepEqual(baseline.fixtures.find(row=>row.input.name==='intro-auto-respawn').expected,{returnValue:true,trace:['Respawn','ActiveBattleEnd']});
});

test('resource-150 changed death modules match the selected original behavior domain',()=>{
  assert.equal(current.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');
  assert.equal(current.fixtures,8);
  assert.equal(current.exactMatches,8);
  assert.equal(current.mismatches,0);
  assert.deepEqual(current.results,[]);
});
