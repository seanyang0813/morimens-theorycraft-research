import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ResearchEffectOrder} from '../engine/effect-order.mjs';
import {ResearchEventDispatcher} from '../engine/event-dispatch.mjs';
import {subtractOrdinaryHp} from '../engine/hp-property.mjs';
import {enqueueHpPropertyEvents} from '../engine/hp-events.mjs';
const fixtures=JSON.parse(readFileSync(new URL('./synthetic/original-effect-order.json',import.meta.url))).fixtures;
for(const {input,expected} of fixtures){
  const order=new ResearchEffectOrder(),trace=[];let executedHits=0;
  order.enqueue(i=>{
    executedHits++;const n=i+1;
    order.enqueue(()=>{
      trace.push('hit'+n);
      order.enqueue(()=>{
        trace.push('event'+n);
        order.enqueue(()=>{trace.push('command'+n);if(input.finishEarly)order.finishBattle();});
        order.enqueue(()=>trace.push('attached'+n),{attached:true});
      });
    });
  },{repetitions:2});
  order.enqueue(()=>trace.push('sibling'));
  order.run();
  assert.deepEqual({trace,battleFinished:order.finished,executedHits},expected);
}

// Synthetic composition: a deferred HP listener changes the next request.
// This is a wiring check, not a translation of any named boss state.
const order=new ResearchEffectOrder(),events=new ResearchEventDispatcher();
let hp=100,request=10;const losses=[],seen=[];
events.register(203,(_target,data)=>{
  seen.push({...data});order.enqueue(()=>{request=20;});
},{eventPriority:99});
order.enqueue(()=>{
  const old=hp,result=subtractOrdinaryHp({hp,request});hp=result.hpAfter;losses.push(result.hpLost);
  enqueueHpPropertyEvents({property:'hp',old,new:hp,hp,max_hp:100,uid:7,castRoleUid:9},(id,payload)=>order.enqueue(()=>events.send(id,payload)));
},{repetitions:2});
order.run();
assert.deepEqual(losses,[10,20]);assert.equal(hp,70);
assert.deepEqual(seen.map(d=>[d.oldValue,d.newValue,d.hp,d.max_hp]),[[100,90,90,100],[90,70,70,100]]);
