import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolvePhaseHpLoss} from '../engine/phase-cap.mjs';

const fixture=JSON.parse(readFileSync(new URL('./synthetic/original-joined-phase-command-effects.json',import.meta.url)));
const current=JSON.parse(readFileSync(new URL('../research/evidence/pc-res150-joined-phase-command-effects-runtime.json',import.meta.url)));

test('joined original expressions and effect bodies match the authored phase transition',()=>{
  assert.equal(fixture.fixtures.length,5);
  for(const row of fixture.fixtures){
    const input=row.input;
    const modeled=resolvePhaseHpLoss({maxHp:input.maxHp,phaseId:input.phaseId,phaseLayers:input.phaseLayers,counter:input.counter,immune:false},input.hpLoss);
    assert.deepEqual(row.expected.state,modeled.state,JSON.stringify(input));
    assert.deepEqual(row.expected.operations,modeled.operations,JSON.stringify(input));
    assert.ok(row.expected.passedRows.length>=2);
  }
});

test('installed resource 150 reproduces joined phase command/effect fixtures',()=>{
  assert.equal(current.status,'CURRENT_CHANGED_MODULES_RUNTIME_MATCH');
  assert.deepEqual(current.changedModules,['FuncTable','Cmd','BEAddStateParent']);
  assert.equal(current.fixtures,5);
  assert.equal(current.matched,5);
  assert.equal(current.mismatches,0);
});
