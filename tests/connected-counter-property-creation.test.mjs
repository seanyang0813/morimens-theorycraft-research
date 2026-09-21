import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const fixture=JSON.parse(readFileSync(new URL('./synthetic/original-connected-counter-property-creation.json',import.meta.url)));
const current=JSON.parse(readFileSync(new URL('../research/evidence/pc-res150-connected-counter-property-creation-runtime.json',import.meta.url)));

test('first counter creation reaches original be_damage_statics storage',()=>{
  assert.equal(fixture.fixtures.length,5);
  for(const row of fixture.fixtures){
    const requested=row.input.requestedLayer;
    assert.equal(row.expected.registryCount,1);
    assert.equal(row.expected.stateId,60407);
    assert.equal(row.expected.layer,requested);
    assert.equal(row.expected.changedLayer,requested);
    assert.equal(row.expected.beDamageStatics,requested);
    const propertyEvents=row.expected.trace.filter(event=>typeof event==='object');
    assert.deepEqual(propertyEvents,[
      {event:'ownerProperty',property:'be_damage_statics',old:0,new:requested},
      {event:'sendProperty',property:'be_damage_statics',delta:requested,new:requested},
    ]);
  }
});

test('installed changed add/property modules reproduce counter creation fixtures',()=>{
  assert.equal(current.status,'CURRENT_CHANGED_MODULES_RUNTIME_MATCH');
  assert.deepEqual(current.changedModules,['BEAddStateParent','BattlePropertyServer']);
  assert.equal(current.fixtures,5);
  assert.equal(current.matched,5);
  assert.equal(current.mismatches,0);
});
