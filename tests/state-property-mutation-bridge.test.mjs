import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeStateProperty,updateStateProperty} from '../engine/state-property-contribution.mjs';
import {changeCombatProperty} from '../engine/combat-property-mutation.mjs';

test('state contributions and actual numeric storage match 432 connected original chains',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-state-property-mutation-bridge.json',import.meta.url),'utf8'));
  assert.equal(evidence.fixtures.length,432);
  for(const {input:v,expected} of evidence.fixtures){
    let propertyAfter=10;const callbacks=[];
    const apply=delta=>{
      if(delta===null||v.banned)return;
      const change=changeCombatProperty({property:v.property,before:propertyAfter,delta,critScale:0,critDamageScale:0,castValue:null});
      propertyAfter=change.after;callbacks.push(...change.callbacks);
    };
    const special=v.property==='vulnerable_per';
    const initial=initializeStateProperty({property:v.property,expression:v.layerSensitive?'ChangedLayer * coefficient':'flat',evaluate:()=>v.base,specialValue:special?v.specialBefore:null,skipInit:v.skipInit});
    apply(initial.requestedDelta);
    const final=updateStateProperty({contribution:initial.contribution,changedLayer:v.changedLayer,evaluate:()=>v.delta,specialValue:special?v.specialAfter:null});
    apply(final.requestedDelta);
    const snapshot=c=>({value:c.value,changeByLayer:c.changeByLayer});
    assert.deepEqual({contributions:{initial:snapshot(initial.contribution),final:snapshot(final.contribution)},propertyAfter,callbacks},expected,JSON.stringify(v));
  }
});
