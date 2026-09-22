import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assembleWheelLoadoutProperties} from '../engine/wheel-loadout-properties.mjs';

const catalog=JSON.parse(readFileSync(new URL('../website/dist/build-catalog.json',import.meta.url),'utf8'));
const mechanics={build:'pc-res144-build51',sourceHashes:{crosswalk:'a'.repeat(64),State:'b'.repeat(64)},crosswalkRows:[
  {wheelId:'wheel-0128',status:'UNIQUE',candidates:[{initialStateId:134231,stateTarget:'TargetCmdOwner',stateParameters:{1:'13+GetRefiningLevel()*4',2:'25+GetRefiningLevel()*5',3:'4+GetRefiningLevel()*2'}}]},
  {wheelId:'wheel-0132',status:'UNIQUE',candidates:[{initialStateId:134313,stateTarget:'TargetCmdOwner',stateParameters:{1:'4+GetRefiningLevel()*2',2:'9+GetRefiningLevel()*2'}}]},
],states:{134231:{ExistProperty:{o_block_per:'StateArg1'},TriggerCmd1:1},134313:{ExistProperty:{o_block_per:'StateArg1'},TriggerCmd1:2}}};
const plan=()=>({schemaVersion:2,kind:'morimens-build-plan',catalogRevision:catalog.source.revision,clientBuild:'pc-res144-build51',team:[{slotId:'arachne',characterId:'awakener-0056',level:90,gnosticRank:5,advancementTalentId:null,advancementLevel:null,wheelSlots:[{slotId:'wheel-1',wheelId:'wheel-0128',enhanceLevel:15,refinementLevel:3},{slotId:'wheel-2',wheelId:'wheel-0132',enhanceLevel:15,refinementLevel:3}]}]});

test('two-Wheel loadout sums direct properties while leaving both trigger graphs unresolved',()=>{
  const result=assembleWheelLoadoutProperties({schemaVersion:1,kind:'morimens-wheel-loadout-properties',buildPlan:plan(),ownerPropertiesByMember:{arachne:null}},catalog,mechanics);
  assert.equal(result.status,'DIRECT_PROPERTIES_RESOLVED');
  assert.deepEqual(result.members[0].rawPropertyValues,{o_block_per:35});
  assert.deepEqual(result.members[0].clientInitializationDeltas,{o_block_per:35});
  assert.equal(result.members[0].wheels.length,2);
  assert.ok(result.members[0].wheels.every(row=>row.triggerExecutionStatus==='UNRESOLVED'));
  assert.equal(result.finalDamage,null);
});

test('loadout resolver reports missing refinement and owner inputs without neutral defaults',()=>{
  const unknownRefinement=plan();unknownRefinement.team[0].wheelSlots[0].refinementLevel=null;
  let result=assembleWheelLoadoutProperties({schemaVersion:1,kind:'morimens-wheel-loadout-properties',buildPlan:unknownRefinement,ownerPropertiesByMember:{}},catalog,mechanics);
  assert.equal(result.status,'INCOMPLETE_INPUT');assert.equal(result.issues[0].code,'WHEEL_REFINEMENT_REQUIRED');
  const statMechanics=JSON.parse(JSON.stringify(mechanics));statMechanics.states[134231].ExistProperty={block_plus:'StateArg1*StateOwner.physique*0.01*(1+StateOwner.physique_per/100)'};
  result=assembleWheelLoadoutProperties({schemaVersion:1,kind:'morimens-wheel-loadout-properties',buildPlan:plan(),ownerPropertiesByMember:{arachne:null}},catalog,statMechanics);
  assert.equal(result.issues[0].code,'OWNER_PROPERTIES_REQUIRED');
});
