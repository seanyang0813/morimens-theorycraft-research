import test from 'node:test';
import assert from 'node:assert/strict';
import {runCardActionTimeline} from '../engine/card-action-timeline.mjs';
import {neutralShowInputs} from '../engine/show-damage.mjs';
import {targetKeys} from '../engine/active-target.mjs';
const build='pc-res144-build51';
const conditions={cardExists:true,inHand:true,judgeCost:true,commandExists:true,dead:false,strike:true,allowIgnoreCost:false,cardUseless:0,ownerUseless:0,coma:0,comaImmunity:0,ownerForbid:0,playerForbid:0,ownerForbidStrike:0,playerForbidStrike:0};
const hit=(id,amount)=>({id,immune:false,puncture:false,scenario:{build,mode:'experimental',damageType:'FIXED',effect:{build,category:'FIXED',targetDead:false,baseDamage:amount,dimensionFixPer:0,fixed1:0,fixed2:0,fixed3:0,fixed4:0,fixed5:0}}});
const card=(id,cost,amount)=>({id,cardInstanceId:id,costInput:{cfgCost:String(cost),originCost:cost==='X'?0:cost,delta:0,harmonize:0,fixedSwitches:{},keeper:false,keeperCost:null,pvp:false},conditions:{...conditions},hits:[hit(id+'/hit',amount)]});
const input=steps=>({schemaVersion:1,kind:'morimens-card-action-timeline',build,interveningEffects:'assumed-absent',initialEnergy:5,target:{hp:1000,block:100},steps});
const commandCard=(id,cost,expression)=>{
  const {hits,...step}=card(id,cost,0),{value,...offense}=neutralShowInputs(0);
  return {...step,command:{rows:[{id:'damage',Type:'BEActiveDamage',Target:'UpperTarget',Para:expression}],variables:{},offense,
    targetModifiers:{...Object.fromEntries(targetKeys.map(key=>[key,0])),isCrit:false,enemyStateDmgMultiplier:1},repeatModifiers:{plus:0,per:0},immune:false}};
};
test('paid command sequences share energy and live HP; rejected commands never execute',()=>{
  const a=commandCard('a',3,'UpperTarget.hp*.1,2'),b=commandCard('b',2,'UpperTarget.hp*.1,2');
  const v={...input([a,b]),target:{hp:1000,block:0}};const result=runCardActionTimeline(v);
  assert.equal(result.completed,true);assert.equal(result.energyAfter,0);
  assert.deepEqual(result.trace.flatMap(row=>row.command.hits.map(hit=>hit.modeledHpLost)),[100,90,81,73]);
  assert.equal(result.targetAfter.hp,656);assert.equal(result.trace[1].command.initialTarget.hp,810);
  b.costInput.cfgCost='3';b.costInput.originCost=3;
  const rejected=runCardActionTimeline(v);assert.equal(rejected.targetAfter.hp,810);assert.equal(rejected.energyAfter,2);assert.equal(rejected.trace[1].command,null);
});
test('mixed hit/command actions preserve shield and reject ambiguous effects or state resets',()=>{
  const a=card('a',1,200),b=commandCard('b',1,'UpperTarget.hp*.1');
  const result=runCardActionTimeline(input([a,b]));assert.equal(result.targetAfter.hp,810);assert.equal(result.energyAfter,3);
  b.command.targetState={hp:1000,block:0};assert.throws(()=>runCardActionTimeline(input([a,b])));delete b.command.targetState;
  b.hits=[];assert.throws(()=>runCardActionTimeline(input([a,b])));delete b.hits;
  assert.throws(()=>runCardActionTimeline({...input([b]),interveningEffects:'old-embers-only-assumed',oldEmbersLayers:100}));
});
test('payment and HP carry together; unaffordable action does not hit',()=>{
  const a=card('a',3,200),b=card('b',3,400),v=input([a,b]),copy=JSON.stringify(v);
  const r=runCardActionTimeline(v);
  assert.equal(r.energyAfter,2);assert.equal(r.modeledHpLost,100);assert.equal(r.acceptedActions,1);
  assert.equal(r.trace[1].hits,null);assert.equal(r.stop.phase,'play-check');
  assert.deepEqual(r.trace[1].before,r.trace[0].after);assert.equal(JSON.stringify(v),copy);
});
test('reordering changes affordable effects without inventing an X damage scaling',()=>{
  const a=card('fixed',3,200),b=card('x','X',400);
  const good=runCardActionTimeline(input([a,b])),bad=runCardActionTimeline(input([b,a]));
  assert.equal(good.completed,true);assert.equal(good.modeledHpLost,500);assert.equal(good.energyAfter,0);
  assert.equal(bad.completed,false);assert.equal(bad.modeledHpLost,300);assert.equal(bad.energyAfter,0);
});
test('lethal effects keep payment but stop remaining hits and later payments',()=>{
  const a=card('a',2,2000),b=card('b',2,100);a.hits.push(hit('extra',10));
  const r=runCardActionTimeline(input([a,b]));assert.equal(r.energyAfter,3);assert.equal(r.stop.phase,'effects');assert.equal(r.trace[0].hits.executedSteps,1);assert.equal(r.unattemptedActions,1);
  a.hits.pop();const s=runCardActionTimeline(input([a,b]));assert.equal(s.stop.phase,'before-payment');assert.equal(s.energyAfter,3);
});
test('Old Embers state persists across separately paid actions',()=>{
  const r=runCardActionTimeline({...input([card('a',1,20),card('b',1,20)]),target:{hp:1000,block:0},interveningEffects:'old-embers-only-assumed',oldEmbersLayers:100});
  assert.equal(r.completed,true);assert.equal(r.energyAfter,3);
  assert.equal(r.trace[1].before.oldEmbersLayers,r.trace[0].after.oldEmbersLayers);
  assert.ok(r.oldEmbersLayersAfter<100);assert.ok(r.modeledHpLost>40);
  assert.deepEqual(r.trace[1].before.target,r.trace[0].after.target);
});
test('invalid unexecuted suffixes, state resets and duplicate hit IDs fail closed',()=>{
  const a=card('a',9,20),b=card('b',1,20);b.hits[0].scenario.effect.baseDamage='invalid';
  assert.throws(()=>runCardActionTimeline(input([a,b])));
  const c=card('c',1,10);c.costInput.energy=99;assert.throws(()=>runCardActionTimeline(input([a,c])));
  const d=card('d',1,10);d.hits[0].id=a.hits[0].id;assert.throws(()=>runCardActionTimeline(input([a,d])));
});
