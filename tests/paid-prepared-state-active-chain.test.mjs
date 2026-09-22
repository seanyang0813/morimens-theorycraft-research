import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runPaidPreparedStateActiveChain} from '../engine/paid-prepared-state-active-chain.mjs';

const read=name=>{const bytes=readFileSync(new URL(`../research/extracted/config/${name}.json`,import.meta.url));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
const loaded=Object.fromEntries(['Skill','BattleApi','Cmd','State'].map(name=>[name,read(name)]));
const source={build:'pc-res144-build51',skills:loaded.Skill.data,battleApi:loaded.BattleApi.data,commands:loaded.Cmd.data,states:loaded.State.data,sourceHashes:Object.fromEntries(Object.entries(loaded).map(([name,row])=>[name,row.sha256]))};
const conditions=strike=>({cardExists:true,inHand:true,judgeCost:true,commandExists:true,dead:false,strike,allowIgnoreCost:false,cardUseless:0,ownerUseless:0,coma:0,comaImmunity:0,ownerForbid:0,playerForbid:0,ownerForbidStrike:0,playerForbidStrike:0});
const step=(index,strike=index>0)=>({id:`action-${index}`,cardInstanceId:`card-${index}`,costInput:{cfgCost:'1',originCost:1,delta:0,harmonize:0,fixedSwitches:{},keeper:false,keeperCost:null,pvp:false},conditions:conditions(strike)});
const input=energy=>{const request=JSON.parse(readFileSync(new URL('../research/examples/theorycraft-prepared-state-active-chain.json',import.meta.url),'utf8'));return {schemaVersion:1,kind:'morimens-paid-prepared-state-active-chain',build:'pc-res144-build51',initialEnergy:energy,chain:request.input,resourceSteps:Array.from({length:6},(_,i)=>step(i))};};

test('paid prepared chain checks and pays before every exposed catalog effect',()=>{
  const value=input(6),before=JSON.stringify(value),result=runPaidPreparedStateActiveChain(value,source);
  assert.equal(result.completed,true);assert.equal(result.acceptedCards,6);assert.equal(result.energyAfter,0);assert.equal(result.modeledEnergyLost,6);
  assert.equal(result.activeSkills.length,5);assert.equal(result.modeledHpLost,15);assert.deepEqual(result.targetAfter,{hp:985,block:0});assert.equal(JSON.stringify(value),before);
});

test('resource rejection suppresses that card and all later effects',()=>{
  const result=runPaidPreparedStateActiveChain(input(4),source);
  assert.equal(result.completed,false);assert.equal(result.stop.phase,'play-check');assert.equal(result.stop.gate,'energy');assert.equal(result.acceptedCards,4);
  assert.equal(result.activeSkills.length,3);assert.equal(result.modeledHpLost,9);assert.deepEqual(result.targetAfter,{hp:991,block:0});assert.equal(result.unattemptedCards,1);
});

test('state-card rejection exposes no state or damage, and lethal damage prevents later payment',()=>{
  const denied=runPaidPreparedStateActiveChain(input(0),source);assert.equal(denied.stateCard,null);assert.equal(denied.carry,null);assert.equal(denied.activeSkills.length,0);assert.equal(denied.modeledHpLost,0);assert.equal(denied.energyAfter,0);
  const lethal=input(6);for(const action of lethal.chain.activeSkills){action.snapshot.initialTargetProperties.hp=2;action.snapshot.initialTargetProperties.max_hp=2;}
  const result=runPaidPreparedStateActiveChain(lethal,source);assert.equal(result.acceptedCards,2);assert.equal(result.energyAfter,4);assert.equal(result.activeSkills.length,1);assert.equal(result.targetAfter.hp,0);assert.equal(result.unattemptedCards,4);assert.equal(result.stop.phase,'effects');
});

test('invalid unexecuted resource suffixes fail before any result is returned',()=>{
  const value=input(0);value.resourceSteps[5].costInput.energy=99;assert.throws(()=>runPaidPreparedStateActiveChain(value,source),/preceding step/);
});

test('paid prepared chain accepts matching installed resource-150 catalogs',()=>{
  const readCurrent=name=>{const bytes=readFileSync(new URL(`../research/observations/current-res150-build51/modules/${name}.json`,import.meta.url));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
  const current=Object.fromEntries(['Skill','BattleApi','Cmd','State'].map(name=>[name,readCurrent(name)]));
  const currentSource={build:'pc-res150-build51',skills:current.Skill.data,battleApi:current.BattleApi.data,commands:current.Cmd.data,states:current.State.data,sourceHashes:Object.fromEntries(Object.entries(current).map(([name,row])=>[name,row.sha256]))};
  const value=input(6);value.build='pc-res150-build51';value.chain.build='pc-res150-build51';value.chain.stateCard.execution.experiment.build='pc-res150-build51';for(const action of value.chain.activeSkills)action.build='pc-res150-build51';
  const result=runPaidPreparedStateActiveChain(value,currentSource);assert.equal(result.build,'pc-res150-build51');assert.equal(result.acceptedCards,6);assert.equal(result.energyAfter,0);assert.equal(result.modeledHpLost,15);
});
