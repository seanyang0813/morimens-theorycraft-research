import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runGeneratedCardPipeline} from '../engine/generated-card-pipeline.mjs';

const create={schemaVersion:1,kind:'morimens-create-card-command',build:'pc-res144-build51',deckExpression:{cardDeck:'HandDeck',camp:3},count:2.2,enternal:null,show:null,explicitCardArgs:null,castRoleUid:77,targets:[{id:1001,level:7,specialOwner:88,performSkillId:123,cardTypes:['Strike'],createCardArgs:[11,22]}]};
const owner=()=>({schemaVersion:1,kind:'morimens-card-owner',build:'pc-res144-build51',camp:3,skillAwakerId:55,playerUid:100,specialOwnerUid:88,configuredAwakerUid:200,fromCardUid:null,fromCard:null,performSkillId:123});
const input={schemaVersion:1,kind:'morimens-generated-card-pipeline',build:'pc-res144-build51',create,manager:{extraBout:false,maxHand:2,initialState:{decks:{NoneDeck:[],DrawDeck:[],HandDeck:[],DimensionDeck:[]},enternalCardUids:[]},allocatedUidsByRequest:[[9001,9002,9003]]},ownerContexts:[owner(),owner(),owner()],commandContexts:[{preCmdId:null,cmdId:5001,rawSkillArguments:[1.2,2.1,3.01]},{preCmdId:null,cmdId:5001,rawSkillArguments:[1.2,2.1,3.01]},{preCmdId:null,cmdId:5001,rawSkillArguments:[1.2,2.1,3.01]}]};

test('generated-card pipeline preserves copied owner and exposes hand overflow',()=>{
  const before=JSON.stringify(input),result=runGeneratedCardPipeline(input);
  assert.equal(result.cards.length,3);assert.deepEqual(result.cards.map(card=>card.resolvedOwnerUid),[88,88,88]);assert.deepEqual(result.cards.map(card=>card.ownerSource),['special-owner','special-owner','special-owner']);
  assert.deepEqual(result.state.decks.HandDeck,[9001,9002]);assert.deepEqual(result.state.decks.NoneDeck,[9003]);assert.deepEqual(result.returnedCardUids,[9001,9002]);assert.equal(JSON.stringify(input),before);
  assert.deepEqual(result.commandPlans.map(row=>row.mainCommand.castRoleUid),[88,88,88]);assert.deepEqual(result.commandPlans.map(row=>row.mainCommand.cmdId),[5001,5001,5001]);assert.deepEqual(result.commandPlans[0].argumentBindings,{Arg1:11,Arg2:22,Arg3:4});
});

test('current resource-150 build uses the cross-build verified pipeline',()=>{
  const current=JSON.parse(JSON.stringify(input));current.build='pc-res150-build51';current.create.build=current.build;for(const context of current.ownerContexts)context.build=current.build;
  const result=runGeneratedCardPipeline(current);assert.equal(result.build,current.build);assert.deepEqual(result.returnedCardUids,[9001,9002]);assert.ok(!result.unresolvedDependencies.some(item=>item.startsWith('BattleCardMgrServer.AddNewCard')));
});

test('pipeline rejects owner evidence that does not match constructed metadata',()=>{
  const bad=JSON.parse(JSON.stringify(input));bad.ownerContexts[1].specialOwnerUid=99;assert.throws(()=>runGeneratedCardPipeline(bad),/does not match/);
  const missing=JSON.parse(JSON.stringify(input));missing.ownerContexts.pop();assert.throws(()=>runGeneratedCardPipeline(missing),/one owner/i);
  const noCommand=JSON.parse(JSON.stringify(input));noCommand.commandContexts.pop();assert.throws(()=>runGeneratedCardPipeline(noCommand),/one command/i);
});

test('pipeline derives a real generated Arachne Strike command from matching catalog evidence',()=>{
  const read=name=>{const bytes=readFileSync(new URL(`../research/extracted/config/${name}.json`,import.meta.url));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
  const skill=read('Skill'),battleApi=read('BattleApi'),command=read('Cmd'),catalogSource={build:'pc-res144-build51',skills:skill.data,battleApi:battleApi.data,commands:command.data,sourceHashes:{Skill:skill.sha256,BattleApi:battleApi.sha256,Cmd:command.sha256}};
  const catalogInput={schemaVersion:1,kind:'morimens-generated-card-pipeline',build:'pc-res144-build51',create:{schemaVersion:1,kind:'morimens-create-card-command',build:'pc-res144-build51',deckExpression:{cardDeck:'HandDeck',camp:3},count:1,enternal:null,show:null,explicitCardArgs:null,castRoleUid:77,targets:[{id:126484,level:1,specialOwner:88,performSkillId:126484,cardTypes:['Strike'],createCardArgs:[0.5]}]},manager:{extraBout:false,maxHand:5,initialState:{decks:{NoneDeck:[],DrawDeck:[],HandDeck:[],DimensionDeck:[]},enternalCardUids:[]},allocatedUidsByRequest:[[9101]]},ownerContexts:[{schemaVersion:1,kind:'morimens-card-owner',build:'pc-res144-build51',camp:3,skillAwakerId:77918,playerUid:100,specialOwnerUid:88,configuredAwakerUid:200,fromCardUid:null,fromCard:null,performSkillId:126484}],commandContexts:[{preCmdId:null,progression:{isAwaker:true,breakSkillLevel:0,potencyLevel:0,variables:{BattleAtkForce:1000},conditionResults:{},stateQueries:{'PlayerRole.GetStateLayer':{'134222':2}}}}]};
  const result=runGeneratedCardPipeline(catalogInput,catalogSource),plan=result.commandPlans[0];
  assert.equal(plan.mainCommand.cmdId,133374);assert.deepEqual(plan.catalogResolution.baseArguments,[100,5,2]);assert.deepEqual(plan.catalogResolution.command.effectTypes,['BEActiveDamage','BEGainUltiEnergy','BEAttachPostAction','BEAddState']);assert.deepEqual(plan.argumentBindings,{Arg1:0.5,Arg2:5,Arg3:2});assert.equal(plan.mainCommand.castRoleUid,88);
});
