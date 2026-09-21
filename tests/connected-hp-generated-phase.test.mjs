import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';
const read=name=>{const bytes=readFileSync(new URL(`../${name}`,import.meta.url));return {bytes,data:JSON.parse(bytes)}};const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
test('eligible connected HP state effects execute target and phase bodies in order',()=>{
  const rows=read('tests/synthetic/original-connected-hp-generated-phase.json').data.fixtures;
  assert.deepEqual(rows.map(row=>row.expected.generatedExecution.length),[2,0,0,2]);
  for(const row of [rows[0],rows[3]]){assert.deepEqual(row.expected.generatedExecution,[{eligible:true,executed:true},{eligible:true,executed:true}]);assert.ok(row.expected.stateTrace.indexOf('OnEnterBeforePhase')<row.expected.stateTrace.indexOf('GenerateEffectList'));assert.deepEqual(row.expected.dispatchErrors,[]);}
});
test('resource-150 connected HP generated-phase path matches all inherited cases',()=>{
  const runtime=read('research/evidence/pc-res150-connected-hp-generated-phase-runtime.json');const fixture=read('tests/synthetic/original-connected-hp-generated-phase.json');assert.equal(runtime.data.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');assert.equal(runtime.data.fixtures,4);assert.equal(runtime.data.exactMatches,4);assert.equal(runtime.data.mismatches,0);assert.equal(runtime.data.sourceHashes.fixture,hash(fixture.bytes));
});
