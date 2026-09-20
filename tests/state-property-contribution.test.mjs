import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeStateProperty,updateStateProperty} from '../engine/state-property-contribution.mjs';
const data=JSON.parse(readFileSync(new URL('./synthetic/original-state-property-lifecycle.json',import.meta.url),'utf8'));

test('property initialization/update match 432 original connected lifecycle cases',()=>{
  assert.equal(data.fixtures.length,432);
  for(const {input:v,expected} of data.fixtures){
    const evaluations=[],special=v.property==='vulnerable_per';
    const initial=initializeStateProperty({property:v.property,expression:v.layerSensitive?'ChangedLayer * coefficient':'flat',
      evaluate:()=>{evaluations.push('init');return v.base;},specialValue:special?v.specialBefore:null,skipInit:v.skipInit});
    const final=updateStateProperty({contribution:initial.contribution,changedLayer:v.changedLayer,
      evaluate:()=>{evaluations.push('update');return v.delta;},specialValue:special?v.specialAfter:null});
    const snapshot=c=>({value:c.value,changeByLayer:c.changeByLayer});
    const mutation=delta=>v.banned||delta===null?[]:[{recipient:'owner',property:v.property,delta}];
    assert.deepEqual({initial:snapshot(initial.contribution),final:snapshot(final.contribution),initialMutations:mutation(initial.requestedDelta),
      updateMutations:mutation(final.requestedDelta),evaluations},expected,JSON.stringify(v));
  }
});

test('special increases preserve fractions and suppress layer expression even at zero increase',()=>{
  const first=initializeStateProperty({property:'vulnerable_per',expression:'ChangedLayer',evaluate:()=>1.2,specialValue:2.2,skipInit:false});
  const next=updateStateProperty({contribution:first.contribution,changedLayer:1,evaluate:()=>{throw Error('must not evaluate');},specialValue:4.4});
  assert.equal(next.requestedDelta,2.2);
  const lower=updateStateProperty({contribution:next.contribution,changedLayer:1,evaluate:()=>{throw Error('must not evaluate');},specialValue:3});
  assert.equal(lower.requestedDelta,0);
  assert.equal(lower.contribution.specialMaximum,4.4);
});

test('missing special input and failed expressions stop explicitly',()=>{
  assert.throws(()=>initializeStateProperty({property:'vulnerable_per',expression:'1',evaluate:()=>1,skipInit:false}));
  assert.throws(()=>initializeStateProperty({property:'basic_damage_per',expression:'missing',evaluate:()=>null,specialValue:null,skipInit:false}));
});
