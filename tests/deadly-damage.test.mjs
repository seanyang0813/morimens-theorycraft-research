import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runDeadlyDamage} from '../engine/deadly-damage.mjs';
import {ResearchEffectOrder} from '../engine/effect-order.mjs';
const data=JSON.parse(readFileSync(new URL('./synthetic/original-deadly-damage.json',import.meta.url)));
for(const {input:v,expected} of data.fixtures){
  let hp=v.hp;const trace=[];
  const role=v.roleExists?{hp:()=>hp,isDeathResist:()=>v.deathResist,deathResist:()=>{trace.push('DeathResist');hp=v.hpAfterDeathResist;},revivePopup:()=>v.revivePopup}:null;
  const returnValue=runDeadlyDamage({role,emit(name){trace.push(name);if(name==='RoleBeforeDeathResist'&&v.healBeforeResist!==null)hp=v.healBeforeResist;if(name==='RoleBeforeDeath'&&v.healBeforeDeath!==null)hp=v.healBeforeDeath;},floatingText(){trace.push('ReviveFloatingText');}});
  assert.deepEqual({returnValue,hp,trace},expected,JSON.stringify(v));
}
console.log(`Passed ${data.fixtures.length} original fatal-damage control-flow cases`);

// Code-derived integration: a child listener queues a heal beneath the event.
// That descendant must complete before fatal damage re-reads HP.
const order=new ResearchEffectOrder(),trace=[];let hp=0;
order.enqueue(()=>{
  runDeadlyDamage({role:{hp:()=>hp,isDeathResist:()=>false,deathResist(){throw new Error('unexpected');},revivePopup:()=>0},emit(name){order.enqueue(()=>{trace.push(name);if(name==='RoleBeforeDeath')order.enqueue(()=>{hp=30;trace.push('heal');});});},floatingText(){trace.push('revived');}});
  trace.push('fatal-body-returned');
},{immediateChildren:true});
order.enqueue(()=>{trace.push(hp>0?'death-skipped':'dead');});
order.run();
assert.deepEqual(trace,['RoleBeforeDeathResist','RoleBeforeDeath','heal','revived','fatal-body-returned','death-skipped']);
assert.equal(hp,30);
