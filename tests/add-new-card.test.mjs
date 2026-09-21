import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyAddNewCardRequest} from '../engine/add-new-card.mjs';

const fixture=JSON.parse(readFileSync(new URL('./synthetic/original-add-new-card.json',import.meta.url),'utf8'));
const observed=name=>fixture.fixtures.find(row=>row.input.name===name).expected;
const config={enternal:null,show:true,cardArgs:[],castRoleUid:77,camp:3,owner:88,performSkillId:123,cardTypes:['Instruction']};
const state=(deck='DrawDeck',existing=[])=>({decks:{NoneDeck:[],DrawDeck:deck==='DrawDeck'?existing:[],HandDeck:deck==='HandDeck'?existing:[],DimensionDeck:[]},enternalCardUids:[]});
const input={schemaVersion:1,kind:'morimens-add-new-card',build:'pc-res144-build51',extraBout:false,request:{targetIndex:0,deck:'DrawDeck',cards:[{tid:1001,level:7}],config},state:state('DrawDeck',[101]),allocatedUids:[9001],maxHand:99};

test('default bottom placement and event match original AddNewCard',()=>{
  const before=JSON.stringify(input),result=applyAddNewCardRequest(input),oracle=observed('draw-default-bottom');
  assert.deepEqual(result.state.decks.DrawDeck,oracle.decks.DrawDeck);assert.deepEqual(result.returnedCards.map(card=>card.uid),oracle.returnedUids);
  assert.deepEqual(result.events.map(event=>({cardUid:event.cardUid,oldDeck:event.oldDeck,newDeck:event.newDeck,castRoleUid:event.castRoleUid,enternal:event.enternal})),oracle.trace.filter(row=>row.cardDeckChange).map(row=>row.cardDeckChange).map(({event,...row})=>row));
  assert.equal(JSON.stringify(input),before);
});

test('full hand creates an unreachable NoneDeck card and returns none',()=>{
  const value={...input,request:{...input.request,deck:'HandDeck',cards:[{tid:1003,level:2}],config:{...config,owner:null,castRoleUid:null,performSkillId:null,cardTypes:[]}},state:state('HandDeck',[101]),maxHand:1};
  const result=applyAddNewCardRequest(value),oracle=observed('hand-at-cap');
  assert.deepEqual(result.returnedCards,[]);assert.deepEqual(result.state.decks.NoneDeck,oracle.decks.NoneDeck);assert.deepEqual(result.state.decks.HandDeck,oracle.decks.HandDeck);assert.equal(result.createdCards[0].deck,'NoneDeck');assert.equal(result.events.length,0);assert.equal(result.records[1].newDeck,'NoneDeck');
});

test('top placement reverses creation order and tracks eternal cards',()=>{
  const value={...input,request:{...input.request,deck:'DrawDeck',cards:[{tid:1005,level:3},{tid:1006,level:4}],config:{...config,enternal:1,camp:4,castRoleUid:66,targetPos:'TOP'}},state:state('DrawDeck',[101]),allocatedUids:[9001,9002]};
  const result=applyAddNewCardRequest(value),oracle=observed('top-two-eternal');
  assert.deepEqual(result.state.decks.DrawDeck,oracle.decks.DrawDeck);assert.deepEqual(result.state.enternalCardUids,oracle.enternalCardUids);assert.deepEqual(result.returnedCards.map(card=>card.uid),oracle.returnedUids);assert.equal(result.events.length,2);
});

test('extra-bout Dimension creation exits before construction',()=>{
  const value={...input,extraBout:true,request:{...input.request,deck:'DimensionDeck'},state:state(),maxHand:99};
  const result=applyAddNewCardRequest(value);assert.deepEqual(result.createdCards,[]);assert.deepEqual(result.returnedCards,[]);assert.deepEqual(result.state,value.state);
});

test('unsupported capacity, placement and identity inputs fail closed',()=>{
  for(const value of [{...input,extraBout:false,request:{...input.request,deck:'DimensionDeck'}},{...input,request:{...input.request,config:{...config,targetPos:'RANDOM'}}},{...input,allocatedUids:[101]},{...input,maxHand:-1},{...input,extra:true}])assert.throws(()=>applyAddNewCardRequest(value));
});
