import test from 'node:test';
import assert from 'node:assert/strict';
import {enumerateLegalCardActions} from '../engine/legal-card-actions.mjs';

const conditions={cardExists:true,inHand:true,judgeCost:true,commandExists:true,dead:false,strike:false,allowIgnoreCost:false,cardUseless:0,ownerUseless:0,coma:0,comaImmunity:0,ownerForbid:0,playerForbid:0,ownerForbidStrike:0,playerForbidStrike:0};
const cost=(cfgCost,originCost=Number(cfgCost))=>({cfgCost,originCost,delta:0,harmonize:0,fixedSwitches:{},keeper:false,keeperCost:null,pvp:false});
const card=(id,cfgCost,extra={})=>({id,cardInstanceId:`instance-${id}`,costInput:cost(cfgCost,cfgCost==='X'?0:Number(cfgCost)),conditions:{...conditions,...extra}});
const input=cards=>({schemaVersion:1,kind:'morimens-legal-card-actions',build:'pc-res150-build51',energy:3,dispatch:{waiting:false,rootExists:false,finished:false,waitingTimes:0},cards});

test('enumerates affordable, unaffordable, X-cost and prohibited cards without mutation',()=>{
  const value=input([card('cheap','2'),card('expensive','4'),card('x','X'),card('forbidden','1',{ownerForbid:1})]),copy=JSON.stringify(value);
  const result=enumerateLegalCardActions(value);
  assert.deepEqual(result.legalActionIds,['cheap','x']);
  assert.deepEqual(result.actions.map(row=>[row.id,row.available,row.cardGate,row.energyAfterIfPlayed]),[
    ['cheap',true,'passed',1],['expensive',false,'energy',null],['x',true,'passed',0],['forbidden',false,'prohibition',null]
  ]);
  assert.equal(result.actions[2].variableCost,true);assert.equal(result.finalDamage,null);assert.equal(JSON.stringify(value),copy);
});

test('global dispatch gates suppress every otherwise legal card and preserve diagnostics',()=>{
  for(const [patch,gate] of [[{waiting:true},'waiting'],[{rootExists:true},'running-effect'],[{finished:true},'battle-finished']]){
    const value=input([card('a','1')]);value.dispatch={...value.dispatch,...patch};
    const result=enumerateLegalCardActions(value);assert.deepEqual(result.legalActionIds,[]);assert.equal(result.actions[0].globalGate,gate);assert.equal(result.actions[0].cardGate,'passed');
  }
});

test('legal-action enumeration rejects ambiguous identity and energy overrides',()=>{
  assert.throws(()=>enumerateLegalCardActions(input([card('same','1'),card('same','2')])),/unique/);
  const value=input([card('a','1')]);value.cards[0].costInput.energy=99;assert.throws(()=>enumerateLegalCardActions(value),/must not replace/);
  assert.throws(()=>enumerateLegalCardActions({...input([]),extra:true}),/exact version 1/);
});
