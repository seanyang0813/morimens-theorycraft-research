import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const fixture=JSON.parse(readFileSync(new URL('./synthetic/original-connected-phase-property-creation.json',import.meta.url)));
const current=JSON.parse(readFileSync(new URL('../research/evidence/pc-res150-connected-phase-property-creation-runtime.json',import.meta.url)));

test('second-phase creation stores transition layers and incoming limit together',()=>{
  assert.equal(fixture.fixtures.length,7);
  for(const row of fixture.fixtures){
    const {maxHp,requestedLayer,resolvedLimit}=row.input;
    assert.equal(resolvedLimit,Math.ceil(maxHp*0.33));
    assert.equal(requestedLayer,resolvedLimit+1);
    assert.equal(row.expected.registryCount,1);
    assert.equal(row.expected.stateId,60408);
    assert.equal(row.expected.layer,requestedLayer);
    assert.equal(row.expected.beDamageLimit,resolvedLimit);
    assert.deepEqual(row.expected.storedProperty,{name:'be_damage_limit',value:resolvedLimit});
  }
});

test('installed changed add/property modules reproduce phase-limit creation fixtures',()=>{
  assert.equal(current.status,'CURRENT_CHANGED_MODULES_RUNTIME_MATCH');
  assert.deepEqual(current.changedModules,['BEAddStateParent','BattlePropertyServer']);
  assert.equal(current.fixtures,7);
  assert.equal(current.matched,7);
  assert.equal(current.mismatches,0);
});
