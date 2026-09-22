import test from 'node:test';
import assert from 'node:assert/strict';
import {runMortalBlastCopySuffix} from '../engine/mortal-blast-copy-suffix.mjs';

const card=(uid,id,stateIds=[])=>({uid,id,level:90,camp:1,specialOwner:56,performSkillId:id,cardTypes:['Card_Strike'],stateIds,createCardArgs:[0.5]});
const clone=value=>JSON.parse(JSON.stringify(value));
const base={schemaVersion:1,kind:'morimens-mortal-blast-copy-suffix',build:'pc-res150-build51',potencyGreaterThanOne:true,historySelection:{schemaVersion:1,kind:'morimens-copy-history-card-selection',build:'pc-res150-build51',cardTypes:['Card_Strike'],endNum:0,beginNum:99,needNum:1,skipSameId:0,exceptCardTypes:[],exceptStateIds:[123811,124733],history:[[card(1,126484)],[card(2,122483,[123811])]]},castRoleUid:94450,camp:1,cardManagerState:{decks:{NoneDeck:[],DrawDeck:[30],HandDeck:[40],DimensionDeck:[]},enternalCardUids:[]},allocatedCardUid:99,maxHand:5};

test('Mortal Blast selects, creates, retargets and annotates one eligible copied Strike',()=>{
  const before=JSON.stringify(base),result=runMortalBlastCopySuffix(base);
  assert.deepEqual(result.selection.selectedUids,[1]);
  assert.deepEqual(result.manager.state.decks.HandDeck,[99,40]);
  assert.deepEqual(result.lastTargetCards.map(card=>card.uid),[99]);
  assert.deepEqual(result.cardsAfter[0].stateIds,[2948,2454,2983]);
  assert.deepEqual(result.cardsAfter[0].propertyDeltas,{card_cost:-1,consume:1,nothingness:1});
  assert.deepEqual(result.attachedStates.map(row=>[row.stateId,row.cardUid]),[[2948,99],[2454,99],[2983,99]]);
  assert.equal(result.finalDamage,null);assert.equal(JSON.stringify(base),before);
});

test('hand overflow leaves BECreateCard and LastTarget with no returned card',()=>{
  const input=clone(base);input.maxHand=1;
  const result=runMortalBlastCopySuffix(input);
  assert.deepEqual(result.manager.createdCards.map(card=>card.uid),[99]);
  assert.deepEqual(result.manager.state.decks.NoneDeck,[99]);
  assert.deepEqual(result.lastTargetCards,[]);assert.deepEqual(result.attachedStates,[]);
});

test('no eligible Strike produces no card or state target',()=>{
  const input=clone(base);input.historySelection.history=[[card(2,122483,[123811])]];
  const result=runMortalBlastCopySuffix(input);
  assert.equal(result.creation,null);assert.deepEqual(result.lastTargetCards,[]);assert.deepEqual(result.attachedStates,[]);
});

test('Mortal Blast suffix rejects an altered selector or unproven potency branch',()=>{
  const selector=clone(base);selector.historySelection.exceptStateIds=[];
  assert.throws(()=>runMortalBlastCopySuffix(selector),/Exact Mortal Blast history selector/);
  assert.throws(()=>runMortalBlastCopySuffix({...base,potencyGreaterThanOne:false}),/proven potency/);
});
