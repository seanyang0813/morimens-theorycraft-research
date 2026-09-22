import test from 'node:test';
import assert from 'node:assert/strict';
import {runCardResourceTimeline} from '../engine/card-resource-timeline.mjs';
const conditions={cardExists:true,inHand:true,judgeCost:true,commandExists:true,dead:false,strike:true,allowIgnoreCost:false,cardUseless:0,ownerUseless:0,coma:0,comaImmunity:0,ownerForbid:0,playerForbid:0,ownerForbidStrike:0,playerForbidStrike:0};
const card=(id,cfgCost,originCost)=>({id,cardInstanceId:id,costInput:{cfgCost,originCost,delta:0,harmonize:0,fixedSwitches:{},keeper:false,keeperCost:null,pvp:false},conditions});
const timeline=steps=>({schemaVersion:1,kind:'morimens-card-resource-timeline',build:'pc-res144-build51',interveningEffects:'assumed-absent',initialEnergy:5,steps});
test('energy carries across cards and order changes which sequence can finish',()=>{
  const fixed=card('fixed','3',3),variable=card('variable','X',0);
  const good=runCardResourceTimeline(timeline([fixed,variable]));assert.equal(good.completed,true);assert.deepEqual(good.trace.map(t=>[t.energyBefore,t.energyAfter]),[[5,2],[2,0]]);
  const bad=runCardResourceTimeline(timeline([variable,fixed]));assert.equal(bad.completed,false);assert.equal(bad.acceptedSteps,1);assert.equal(bad.stop.gate,'energy');assert.equal(bad.trace[1].result.payment,null);
});
test('rejection preserves energy, invalid suffixes reject, and duplicate card availability cannot be invented',()=>{
  const a=card('a','3',3),b=card('b','3',3),c=card('c','1',1);
  const r=runCardResourceTimeline(timeline([a,b,c]));assert.equal(r.energyAfter,2);assert.equal(r.unattemptedSteps,1);assert.equal(r.trace.length,2);
  assert.throws(()=>runCardResourceTimeline(timeline([a,{...b,cardInstanceId:'a'}])));
  assert.throws(()=>runCardResourceTimeline(timeline([a,b,{...c,costInput:{...c.costInput,energy:99}}])));
});
test('the same resource projection accepts the current resource-150 build label',()=>{
  const value=timeline([card('a','3',3)]);value.build='pc-res150-build51';const result=runCardResourceTimeline(value);assert.equal(result.build,'pc-res150-build51');assert.equal(result.energyAfter,2);
});
