import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {endStateLife} from '../engine/state-life-end.mjs';
const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-state-life-end.json',import.meta.url)));
test('LifeEnd exposes deletion before side effects and does not repeat them',()=>{
  for(const {input:i,expected} of evidence.fixtures){
    const state={uid:88,isDeleted:i.deleted},trace=[];
    const observe=event=>()=>trace.push({event,deleted:state.isDeleted});
    for(let n=0;n<i.calls;n++)endStateLife({state,teamUnique:i.unique,removeUniqueStateRole:observe('RemoveUniqueStateRole'),removeProperty:observe('RemoveProperty'),onDelState:observe('OnDelState'),log:observe('Log'),createStateLifeEnd:payload=>{assert.deepEqual(payload,{stateUid:88});observe('StateLifeEnd')();}});
    assert.deepEqual({deleted:state.isDeleted,trace},expected);
  }
});
test('reentrant LifeEnd during property removal cannot duplicate lifecycle events',()=>{
  const state={uid:1,isDeleted:false},trace=[];
  const args={state,teamUnique:false,removeUniqueStateRole:()=>{},removeProperty:()=>{trace.push('remove');assert.equal(endStateLife(args),false);},onDelState:()=>trace.push('record'),log:()=>{},createStateLifeEnd:()=>trace.push('event')};
  assert.equal(endStateLife(args),true);assert.deepEqual(trace,['remove','record','event']);
});
