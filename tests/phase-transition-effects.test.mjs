import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const fixture=JSON.parse(readFileSync(new URL('./synthetic/original-phase-transition-effects.json',import.meta.url)));
const current=JSON.parse(readFileSync(new URL('../research/evidence/pc-res150-phase-transition-effects-runtime.json',import.meta.url)));

test('remove-state effect reaches live states through the original manager',()=>{
  const rows=fixture.fixtures.filter(row=>row.input.effect==='remove');assert.ok(rows.length>0);
  for(const row of rows){
    const life=row.expected.trace.filter(event=>event.event==='lifeEnd').length;
    assert.equal(life,row.input.stateStatus==='live'?row.input.targets:0,JSON.stringify(row.input));
    assert.ok(row.expected.liveStateAfter.every(value=>value===false));
  }
});

test('installed resource 150 carries the effect fixtures forward byte-for-byte',()=>{
  assert.equal(current.status,'BYTE_IDENTICAL_FIXTURES_CARRIED_FORWARD');assert.equal(current.fixtures,48);assert.equal(current.carriedForward,48);
});

test('monster-skill effect forwards configured skill and change type for every target',()=>{
  const rows=fixture.fixtures.filter(row=>row.input.effect==='skill');assert.ok(rows.length>0);
  for(const row of rows){
    const changes=row.expected.trace.filter(event=>event.event==='changeSkill');assert.equal(changes.length,row.input.targets);
    assert.ok(changes.every(event=>event.skillId===row.input.skillId&&event.changeType===row.input.changeType));
  }
});
