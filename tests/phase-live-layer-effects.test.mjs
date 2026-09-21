import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const fixture=JSON.parse(readFileSync(new URL('./synthetic/original-phase-live-layer-effects.json',import.meta.url)));
const current=JSON.parse(readFileSync(new URL('../research/evidence/pc-res150-phase-live-layer-effects-runtime.json',import.meta.url)));

test('one live registry receives original counter addition then phase subtraction',()=>{
  assert.equal(fixture.fixtures.length,60);
  for(const row of fixture.fixtures){
    const {counterBefore,phaseBefore,amount}=row.input;
    assert.equal(row.expected.counterAfter,Math.min(999999999,counterBefore+amount));
    assert.equal(row.expected.phaseAfter,Math.max(0,phaseBefore-amount));
    assert.deepEqual(row.expected.trace.slice(0,5).map(event=>typeof event==='string'?event:event.event),['propertyDelta','record','log','stateOnAdd','stats']);
    const phaseEvents=row.expected.trace.slice(5).map(event=>event.event);
    assert.deepEqual(phaseEvents.slice(0,3),['propertyDelta','record','log']);
    assert.equal(phaseEvents.includes('lifeEnd'),phaseBefore<=amount);
  }
});

test('installed resource 150 changed add parent reproduces every connected fixture',()=>{
  assert.equal(current.status,'CURRENT_CHANGED_PARENT_RUNTIME_MATCH');
  assert.deepEqual(current.changedModules,['BEAddStateParent']);
  assert.equal(current.fixtures,60);
  assert.equal(current.matched,60);
  assert.equal(current.mismatches,0);
});
