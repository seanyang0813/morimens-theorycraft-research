import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveCriticalHit} from '../engine/crit-resolution.mjs';

const fixture=JSON.parse(fs.readFileSync(new URL('./synthetic/original-crit-resolution.json',import.meta.url),'utf8'));
const adapt=input=>({tags:input.tags,cardPresent:input.cardPresent,casterIsAwaker:input.casterIsAwaker,casterProperties:input.caster,playerProperties:input.player,targetProperties:input.target,cardProperties:input.card,roll:input.roll});

test('critical-hit translation matches original client methods on every oracle fixture',()=>{
  assert.equal(fixture.kind,'SYNTHETIC_ORIGINAL_RUNTIME');assert.equal(fixture.fixtures.length,263);
  for(const row of fixture.fixtures)assert.equal(resolveCriticalHit(adapt(row.input)).isCrit,row.expected,row.id);
});
test('uncertain chance fails closed without a roll while bounded outcomes remain knowable',()=>{
  const base={tags:[],cardPresent:false,casterIsAwaker:false,casterProperties:{crit:50},playerProperties:{},targetProperties:{},cardProperties:{},roll:null};
  const unresolved=resolveCriticalHit(base);assert.equal(unresolved.status,'RNG_REQUIRED');assert.equal(unresolved.isCrit,null);assert.equal(unresolved.critChanceCeil,50);assert.equal(unresolved.rngConsumed,true);
  assert.equal(resolveCriticalHit({...base,casterProperties:{crit:100}}).isCrit,true);
  assert.equal(resolveCriticalHit({...base,casterProperties:{crit:0}}).isCrit,false);
});
test('strict HP thresholds and certain-crit branches do not consume the RNG draw',()=>{
  const base={tags:[],cardPresent:false,casterIsAwaker:true,casterProperties:{crit2gt_hp_per:.5},playerProperties:{},targetProperties:{hp:50,max_hp:100},cardProperties:{},roll:null};
  assert.equal(resolveCriticalHit(base).reason,'chance_guarantees_result');
  const hit=resolveCriticalHit({...base,targetProperties:{hp:51,max_hp:100}});
  assert.equal(hit.reason,'crit2gt_hp_per');assert.equal(hit.rngConsumed,false);
  assert.throws(()=>resolveCriticalHit({...base,targetProperties:{hp:1,max_hp:0}}),/positive target max_hp/);
});
