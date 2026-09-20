import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createManagedState} from '../engine/state-manager-creation.mjs';
function setup(v){
  const registry=new Map();
  if(v.existing!=='absent')registry.set(7,[{uid:77,stateId:2669,isDeleted:v.existing==='deleted'}]);
  const calls=[];
  const hooks={construct:()=>({uid:88,stateId:2669,isDeleted:false}),merge:()=>calls.push('merge'),
    afterInit:state=>{assert.ok(registry.get(7).includes(state));calls.push('afterInit');},serialize:()=>({}),record:()=>{},changeUniqueRole:()=>{},queueOnAdd:()=>calls.push('onAdd'),recordStats:()=>{}};
  return {registry,calls,args:{target:{uid:7,role:v.role,dead:v.dead},createArgs:{stateId:2669,layer:v.layer,skipOnAdd:v.skipOnAdd},registry,deathHandling:v.deathHandling,teamUnique:v.unique,hooks}};
}
test('manager routing, registry counts and ordering match 864 original cases',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-state-manager-creation.json',import.meta.url),'utf8'));
  assert.equal(evidence.fixtures.length,864);
  for(const {input:v,expected} of evidence.fixtures){
    const {registry,args}=setup(v),actual=createManagedState(args);
    assert.deepEqual({returnedUid:actual.state?.uid??null,registryCount:registry.get(7)?.length??0,trace:actual.trace},expected,JSON.stringify(v));
  }
});
test('merge emits on-add after merge; skipOnAdd suppresses event and statistics',()=>{
  const v={role:'Monster',dead:false,deathHandling:'Wipe',layer:2,existing:'live',skipOnAdd:false,unique:true};
  const normal=setup(v);createManagedState(normal.args);assert.deepEqual(normal.calls,['merge','onAdd']);
  const skip=setup({...v,skipOnAdd:true});createManagedState(skip.args);assert.deepEqual(skip.calls,['merge']);
});
test('missing lifecycle hooks cannot become silent no-ops',()=>{
  const {args}=setup({role:'Monster',dead:false,deathHandling:'Wipe',layer:2,existing:'absent',skipOnAdd:false,unique:false});
  delete args.hooks.afterInit;assert.throws(()=>createManagedState(args));
});
