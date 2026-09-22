import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runCreateCardCommand} from '../engine/create-card-command.mjs';

const original=JSON.parse(readFileSync(new URL('./synthetic/original-create-card.json',import.meta.url),'utf8'));
const base={schemaVersion:1,kind:'morimens-create-card-command',build:'pc-res144-build51',deckExpression:{cardDeck:'HandDeck',camp:3},count:2.2,enternal:null,show:null,explicitCardArgs:null,castRoleUid:77,
  targets:[{id:1001,level:7,specialOwner:88,performSkillId:123,cardTypes:['Instruction'],createCardArgs:[11,22]}]};

test('generated-card request matches the original runtime boundary',()=>{
  const before=JSON.stringify(base),result=runCreateCardCommand(base),request=result.requests[0];
  assert.equal(result.createdCardCount,3);assert.deepEqual(request.cards,[{tid:1001,level:7},{tid:1001,level:7},{tid:1001,level:7}]);
  assert.deepEqual(request.config,{enternal:0,show:true,cardArgs:[11,22],castRoleUid:77,camp:3,owner:88,performSkillId:123,cardTypes:['Instruction']});
  const observed=original.fixtures.find(item=>item.input.name==='default-copy-args').expected.events[0].addNewCard;
  assert.equal(observed.cards.length,request.cards.length);assert.equal(observed.config.castRoleUid,request.config.castRoleUid);assert.equal(observed.config.owner,request.config.owner);assert.equal(observed.config.camp,request.config.camp);assert.equal(JSON.stringify(base),before);
});

test('explicit arguments and show flag follow original branches',()=>{
  const result=runCreateCardCommand({...base,count:1,show:0,explicitCardArgs:[31,32,33]});
  assert.equal(result.requests[0].config.show,false);assert.deepEqual(result.requests[0].config.cardArgs,[31,32,33]);
  assert.equal(runCreateCardCommand({...base,show:1}).requests[0].config.show,true);
  assert.equal(runCreateCardCommand({...base,targets:[{...base.targets[0],specialOwner:null}]}).requests[0].config.owner,null);
});

test('each selected source card produces a separate manager request',()=>{
  const result=runCreateCardCommand({...base,count:1,enternal:9,deckExpression:{cardDeck:'DrawDeck',camp:4},targets:[base.targets[0],{...base.targets[0],id:1005,level:3,specialOwner:null}]});
  assert.equal(result.requests.length,2);assert.equal(result.createdCardCount,2);assert.deepEqual(result.requests.map(request=>request.cards[0]),[{tid:1001,level:7},{tid:1005,level:3}]);assert.equal(result.requests[1].config.enternal,9);assert.equal(result.requests[1].config.camp,4);
  const observed=original.fixtures.find(item=>item.input.name==='multiple-target-cards').expected;
  assert.equal(observed.events.length,2);assert.equal(observed.outputTargetUids.length,2);
});

test('top placement is preserved into the card-manager request',()=>{
  const result=runCreateCardCommand({...base,count:1,deckExpression:{cardDeck:'HandDeck',camp:3,targetPos:'TOP'}});
  assert.equal(result.requests[0].config.targetPos,'TOP');
  const observed=original.fixtures.find(item=>item.input.name==='top-hand-placement').expected;
  assert.equal(observed.events[0].addNewCard.config.targetPos,'TOP');
  assert.deepEqual(observed.outputTargetUids,[9001]);
});

test('generated-card adapter fails closed outside its tested boundary',()=>{
  for(const value of [{...base,deckExpression:{cardDeck:'NoSuchDeck',camp:3}},{...base,count:Infinity},{...base,count:Number.MAX_SAFE_INTEGER+1},{...base,targets:[{...base.targets[0],level:null}]},{...base,extra:true}])assert.throws(()=>runCreateCardCommand(value));
});
