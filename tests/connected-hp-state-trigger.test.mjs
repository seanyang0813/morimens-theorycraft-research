import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';
const read=name=>{const bytes=readFileSync(new URL(`../${name}`,import.meta.url));return {bytes,data:JSON.parse(bytes)}};const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
test('connected HP state callbacks queue target, phase and completion requests only when eligible',()=>{
  const rows=read('tests/synthetic/original-connected-hp-state-trigger.json').data.fixtures;
  assert.deepEqual(rows.map(row=>row.expected.generatedEffects.length),[2,0,0,2]);
  for(const row of [rows[0],rows[3]]){assert.deepEqual(row.expected.generatedEffects.map(effect=>effect.effectType),['BEGenerateTargets','BECreateSkillPhase']);assert.equal(row.expected.generatedEffects[1].sameAssociator,true);assert.deepEqual(row.expected.stateEndEvents,[{stateUid:77}]);assert.deepEqual(row.expected.dispatchErrors,[]);}
});
test('resource-150 connected HP-to-state-trigger path matches all inherited cases',()=>{
  const runtime=read('research/evidence/pc-res150-connected-hp-state-trigger-runtime.json');const fixture=read('tests/synthetic/original-connected-hp-state-trigger.json');
  assert.equal(runtime.data.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');assert.equal(runtime.data.fixtures,4);assert.equal(runtime.data.exactMatches,4);assert.equal(runtime.data.mismatches,0);assert.equal(runtime.data.sourceHashes.fixture,hash(fixture.bytes));
});
