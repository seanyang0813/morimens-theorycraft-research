import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {endStateLife} from '../engine/state-life-end.mjs';
import {statePropertyRemoval} from '../engine/state-property-removal.mjs';
import {changeCombatProperty} from '../engine/combat-property-mutation.mjs';
test('repeated removal matches original lifecycle through actual property storage',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-state-removal-mutation-bridge.json',import.meta.url),'utf8'));
  assert.equal(evidence.fixtures.length,432);
  for(const {input:v,expected:e} of evidence.fixtures){
    const state={uid:88,isDeleted:false},events=[],callbacks=[];let after=e.before.propertyAfter;
    const hooks={state,teamUnique:false,removeUniqueStateRole:()=>{},removeProperty:()=>{
      const r=statePropertyRemoval({property:v.property,storedValue:e.before.contributions.final.value,apiType:'OTHER',pve:true,playerOwner:false,banned:v.banned,ignoreBan:false,owner:'owner',awakeners:[]});
      for(const m of r.mutations){const changed=changeCombatProperty({property:m.property,before:after,delta:m.delta,critScale:0,critDamageScale:0,castValue:null});after=changed.after;callbacks.push(...changed.callbacks);}
    },onDelState:()=>events.push('recordDeletion'),log:()=>events.push('log'),createStateLifeEnd:()=>events.push('StateLifeEnd')};
    endStateLife(hooks);endStateLife(hooks);
    assert.deepEqual({after,deleted:state.isDeleted,callbacks,events},{after:e.after,deleted:e.deleted,callbacks:e.callbacks,events:e.events},JSON.stringify(v));
  }
});
