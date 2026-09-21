import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const fixture=JSON.parse(readFileSync(new URL('./synthetic/original-connected-state-creation.json',import.meta.url)));
const current=JSON.parse(readFileSync(new URL('../research/evidence/pc-res150-connected-state-creation-runtime.json',import.meta.url)));

test('absent phase-related states traverse original construction and registration',()=>{
  assert.equal(fixture.fixtures.length,16);
  for(const row of fixture.fixtures){
    const {stateId,requestedLayer,maximum}=row.input;
    assert.equal(row.expected.registryCount,1);
    assert.equal(row.expected.stateId,stateId);
    assert.equal(row.expected.layer,Math.min(requestedLayer,maximum));
    assert.equal(row.expected.changedLayer,requestedLayer);
    assert.equal(row.expected.casterLayers9,requestedLayer);
    assert.deepEqual(row.expected.trace,['construct','uid','parser','InitTrigger','LogBattleLayer','InitProperty','Serialize','recordRole','onAdd','stats']);
  }
});

test('installed resource 150 changed add parent reproduces first-time creation fixtures',()=>{
  assert.equal(current.status,'CURRENT_CHANGED_PARENT_RUNTIME_MATCH');
  assert.deepEqual(current.changedModules,['BEAddStateParent']);
  assert.equal(current.fixtures,16);
  assert.equal(current.matched,16);
  assert.equal(current.mismatches,0);
});
