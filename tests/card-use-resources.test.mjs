import test from 'node:test';
import assert from 'node:assert/strict';
import {resolvePveCardResources} from '../engine/card-use-resources.mjs';
const conditions={cardExists:true,inHand:true,judgeCost:true,commandExists:true,dead:false,strike:true,allowIgnoreCost:false,cardUseless:0,ownerUseless:0,coma:0,comaImmunity:0,ownerForbid:0,playerForbid:0,ownerForbidStrike:0,playerForbidStrike:0};
const costInput={cfgCost:'3',originCost:3,delta:0,harmonize:0,fixedSwitches:{},keeper:false,keeperCost:null,pvp:false,energy:2};
test('normal composition rejects unaffordable cards without spending and honors explicit ignore allowance',()=>{
  const denied=resolvePveCardResources({costInput,conditions});assert.equal(denied.check.allowed,false);assert.equal(denied.payment,null);assert.equal(denied.energyAfter,2);
  const free=resolvePveCardResources({costInput,conditions:{...conditions,allowIgnoreCost:true}});assert.equal(free.check.allowed,true);assert.equal(free.plan.branch,'allow_ignore_cost');assert.equal(free.energyAfter,2);
  const paid=resolvePveCardResources({costInput:{...costInput,energy:5},conditions:{...conditions,allowIgnoreCost:true}});assert.equal(paid.energyAfter,2);assert.equal(paid.allowIgnoreCostAfter,false);assert.equal(paid.payment.reportedCost,3);
});
test('X bypasses ordinary affordability, pays available energy, and hand failure still blocks it',()=>{
  const x={...costInput,cfgCost:'X'};
  const paid=resolvePveCardResources({costInput:x,conditions});assert.equal(paid.energyAfter,0);assert.equal(paid.payment.reportedCost,2);
  const denied=resolvePveCardResources({costInput:x,conditions:{...conditions,inHand:false}});assert.equal(denied.check.reasonCode,1);assert.equal(denied.payment,null);
});
