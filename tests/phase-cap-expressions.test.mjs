import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolvePhaseHpLoss} from '../engine/phase-cap.mjs';

const fixture=JSON.parse(readFileSync(new URL('./synthetic/original-phase-cap-expressions.json',import.meta.url)));
const current=JSON.parse(readFileSync(new URL('../research/evidence/pc-res150-phase-cap-expressions-runtime.json',import.meta.url)));

test('phase-cap model matches compiled 60406 and 60405 expressions',()=>{
  assert.equal(fixture.fixtures.length,450);
  for(const row of fixture.fixtures){
    const input=row.input;
    const modeled=resolvePhaseHpLoss({maxHp:input.maxHp,phaseId:input.phaseId,phaseLayers:input.phaseLayers,counter:input.counter,immune:false},input.hpLoss);
    assert.deepEqual(modeled,{state:row.expected.state,operations:row.expected.operations},JSON.stringify(input));
  }
});

test('resource 150 matches all phase-cap compiled-expression cases',()=>{
  assert.equal(current.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');assert.equal(current.fixtures,450);assert.equal(current.exactMatches,450);assert.equal(current.mismatches,0);
});

test('compiled phase expressions preserve the boundary layer and saturate the counter',()=>{
  const transition=fixture.fixtures.find(row=>row.input.maxHp===1000&&row.input.phaseId===60409&&row.input.phaseLayers===2&&row.input.counter===0&&row.input.hpLoss===2);
  assert.equal(transition.expected.state.phaseId,60408);assert.equal(transition.expected.state.phaseLayers,331);
  assert.deepEqual(transition.expected.trace.filter(row=>row.passed).map(row=>row.row),[1,3,4,5,6,7,8]);
  const saturated=fixture.fixtures.find(row=>row.input.phaseId===60408&&row.input.phaseLayers===500&&row.input.counter===999999990&&row.input.hpLoss===125);
  assert.equal(saturated.expected.state.counter,999999999);
});
