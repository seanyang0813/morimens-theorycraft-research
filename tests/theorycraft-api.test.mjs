import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runTheorycraftRequest,theorycraftOperations} from '../engine/theorycraft-api.mjs';
import {neutralShowInputs} from '../engine/show-damage.mjs';
import {targetKeys} from '../engine/active-target.mjs';

const request=(operation,input)=>({schemaVersion:1,kind:'morimens-theorycraft-request',requestId:'test-1',operation,input});

test('agent API advertises explicit bounded operations',()=>{
  const response=runTheorycraftRequest(request('describe-capabilities',null));
  assert.equal(response.status,'OK');
  assert.deepEqual(response.result.operations,theorycraftOperations);
  assert.equal(response.result.publicationStatus,'NOT_READY');
});

test('agent API dispatches the general damage calculator without promoting verification',()=>{
  const target={...Object.fromEntries(targetKeys.map(key=>[key,0])),isCrit:false,enemyStateDmgMultiplier:1};
  const response=runTheorycraftRequest(request('calculate-damage',{mode:'experimental',build:'pc-res144-build51',damageType:'ACTIVE',offense:neutralShowInputs(100),target}));
  assert.equal(response.result.status,'EXPERIMENTAL');
  assert.equal(response.result.finalDamage,null);
  assert.equal(response.result.experimentalModels[0].preHitDamage,100);
});

test('catalog-backed operations require explicit host context',()=>{
  assert.throws(()=>runTheorycraftRequest(request('validate-build-plan',{})),/requires context buildCatalog/);
  const catalog=JSON.parse(readFileSync(new URL('../website/dist/build-catalog.json',import.meta.url),'utf8'));
  const character=catalog.characters[0];
  const response=runTheorycraftRequest(request('validate-build-plan',{schemaVersion:1,kind:'morimens-build-plan',catalogRevision:catalog.source.revision,team:[{slotId:'a',characterId:character.id,level:1,wheelId:null}]}),{buildCatalog:catalog});
  assert.equal(response.result.status,'PLAN_ONLY');
});

test('agent API assembles known build components with both catalogs',()=>{
  const catalog=JSON.parse(readFileSync(new URL('../website/dist/build-catalog.json',import.meta.url),'utf8'));
  const clientBuildData=JSON.parse(readFileSync(new URL('../website/dist/client-build-data.json',import.meta.url),'utf8'));
  const character=catalog.characters.find(row=>clientBuildData.characters.some(client=>client.characterId===row.id));
  const wheel=catalog.wheels[0];
  const talent=clientBuildData.characters.find(row=>row.characterId===character.id).advancementTalents[0];
  const input={schemaVersion:1,kind:'morimens-build-plan',catalogRevision:catalog.source.revision,clientBuild:'pc-res144-build51',team:[{slotId:'one',characterId:character.id,level:90,gnosticRank:5,advancementTalentId:talent.clientTalentId,advancementLevel:10,wheelId:wheel.id,wheelEnhanceLevel:15}]};
  assert.throws(()=>runTheorycraftRequest(request('assemble-build-components',input),{buildCatalog:catalog}),/requires context clientBuildData/);
  const response=runTheorycraftRequest(request('assemble-build-components',input),{buildCatalog:catalog,clientBuildData});
  assert.equal(response.result.assemblyStatus,'KNOWN_COMPONENTS_RESOLVED');
  assert.equal(response.result.finalDamage,null);
});

test('agent API rejects extra fields and unsupported operations',()=>{
  assert.throws(()=>runTheorycraftRequest({...request('describe-capabilities',null),extra:true}),/exact version 1/);
  assert.throws(()=>runTheorycraftRequest(request('invent-result',{})),/Unsupported/);
});
