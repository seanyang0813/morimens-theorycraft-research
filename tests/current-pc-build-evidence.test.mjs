import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {initializeActiveDamageForBuild} from '../engine/active-damage-command.mjs';

const read=name=>{const bytes=readFileSync(new URL(`../${name}`,import.meta.url));return {bytes,data:JSON.parse(bytes)}};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

test('current PC build evidence pins changed modules and the exact utility-formula domain',()=>{
  const comparison=read('research/evidence/pc-res144-to-res150-combat-build.json');
  const runtime=read('research/evidence/pc-res150-show-damage-runtime.json');
  const fixture=read('tests/synthetic/original-runtime.json');
  assert.equal(comparison.data.baselineBuild,'pc-res144-build51');
  assert.equal(comparison.data.currentBuild,'pc-res150-build51');
  assert.equal(comparison.data.compatibility,'REVALIDATION_REQUIRED');
  assert.deepEqual(comparison.data.combatModules.filter(row=>row.status==='CHANGED').map(row=>row.name),[
    'BattleConst.lua','BattleUtilServer.lua','BattleCmdServer.lua','BattlePropertyServer.lua','BEActiveDamage.lua','BattleRecord.lua','BattleEngine.lua',
  ]);
  assert.equal(runtime.data.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');
  assert.equal(runtime.data.fixtures,fixture.data.fixtures.length);
  assert.equal(runtime.data.exactMatches,fixture.data.fixtures.length);
  assert.equal(runtime.data.mismatches,0);
  assert.equal(runtime.data.sourceHashes.comparison,hash(comparison.bytes));
  assert.equal(runtime.data.sourceHashes.fixture,hash(fixture.bytes));
  for(const name of ['BattleConst.lua','BattleUtilServer.lua']){
    const row=comparison.data.combatModules.find(item=>item.name===name);
    assert.equal(runtime.data.sourceHashes['current'+name.replace('.lua','')],row.current[0].sha256);
  }
});

test('current PC target and critical runtime matches the pinned inherited domain',()=>{
  const comparison=read('research/evidence/pc-res144-to-res150-combat-build.json');
  const runtime=read('research/evidence/pc-res150-target-damage-runtime.json');
  const fixture=read('tests/synthetic/original-target-runtime.json');
  assert.equal(runtime.data.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');
  assert.deepEqual(runtime.data.methods,['BattleCmdServer.__GetFinalDamage','BattleCmdServer.GetTargetBeDmgPerMul']);
  assert.equal(runtime.data.fixtures,fixture.data.fixtures.length);
  assert.equal(runtime.data.exactMatches,fixture.data.fixtures.length);
  assert.equal(runtime.data.mismatches,0);
  assert.equal(runtime.data.sourceHashes.comparison,hash(comparison.bytes));
  assert.equal(runtime.data.sourceHashes.fixture,hash(fixture.bytes));
  for(const name of ['BattleConst.lua','BattleUtilServer.lua','BattleCmdServer.lua']){
    const row=comparison.data.combatModules.find(item=>item.name===name);
    assert.equal(runtime.data.sourceHashes['current'+name.replace('.lua','')],row.current[0].sha256);
  }
});

test('current PC Active-effect repeat ordering is build-specific and matches current bytecode',()=>{
  const evidence=read('research/evidence/pc-res150-active-damage-runtime.json');
  const fixture=read('tests/synthetic/original-active-damage-initialization.json');
  const comparison=read('research/evidence/pc-res144-to-res150-combat-build.json');
  assert.equal(evidence.data.status,'BEHAVIOR_CHANGE_CONFIRMED');
  assert.equal(evidence.data.binding.mismatches,0);
  assert.equal(evidence.data.initialization.fixtures,fixture.data.fixtures.length);
  assert.equal(evidence.data.initialization.divergences,12);
  assert.equal(evidence.data.sourceHashes.comparison,hash(comparison.bytes));
  assert.equal(evidence.data.sourceHashes.initializationFixture,hash(fixture.bytes));
  for(const row of fixture.data.fixtures){
    if(!row.input.targetsPresent)continue;
    const changed=evidence.data.divergences.find(item=>JSON.stringify(item.input)===JSON.stringify(row.input));
    const current=changed?.current??row.expected;
    assert.equal(initializeActiveDamageForBuild({build:'pc-res150-build51',...row.input}).totalEffectTimes,current.totalEffectTimes);
    assert.equal(initializeActiveDamageForBuild({build:'pc-res144-build51',...row.input}).totalEffectTimes,row.expected.totalEffectTimes);
  }
  assert.throws(()=>initializeActiveDamageForBuild({build:'unknown',repeat:1,plus:0,per:0}),/Unsupported/);
});

test('current PC selected property paths match the inherited runtime domains',()=>{
  const comparison=read('research/evidence/pc-res144-to-res150-combat-build.json');
  const runtime=read('research/evidence/pc-res150-property-runtime.json');
  const initialization=read('tests/synthetic/original-property-initialization.json');
  const hp=read('tests/synthetic/original-hp-property.json');
  assert.equal(runtime.data.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');
  assert.equal(runtime.data.fixtures,initialization.data.fixtures.length+hp.data.fixtures.length);
  assert.equal(runtime.data.exactMatches,runtime.data.fixtures);
  assert.equal(runtime.data.mismatches,0);
  assert.equal(runtime.data.sourceHashes.comparison,hash(comparison.bytes));
  assert.equal(runtime.data.sourceHashes.initializationFixture,hash(initialization.bytes));
  assert.equal(runtime.data.sourceHashes.hpSubtractionFixture,hash(hp.bytes));
  const row=comparison.data.combatModules.find(item=>item.name==='BattlePropertyServer.lua');
  assert.equal(runtime.data.sourceHashes.currentBattlePropertyServer,row.current[0].sha256);
});

test('current PC command entry gate matches the inherited runtime domain',()=>{
  const comparison=read('research/evidence/pc-res144-to-res150-combat-build.json');
  const runtime=read('research/evidence/pc-res150-command-gate-runtime.json');
  const fixture=read('tests/synthetic/original-command-gate.json');
  assert.equal(runtime.data.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');
  assert.equal(runtime.data.fixtures,fixture.data.fixtures.length);
  assert.equal(runtime.data.exactMatches,runtime.data.fixtures);
  assert.equal(runtime.data.sourceHashes.comparison,hash(comparison.bytes));
  assert.equal(runtime.data.sourceHashes.baselineFixtures,hash(fixture.bytes));
  const row=comparison.data.combatModules.find(item=>item.name==='BattleEngine.lua');
  assert.equal(runtime.data.sourceHashes.currentBattleEngine,row.current[0].sha256);
});

test('current PC event-effect request boundary matches the inherited runtime domain',()=>{
  const comparison=read('research/evidence/pc-res144-to-res150-combat-build.json');
  const runtime=read('research/evidence/pc-res150-engine-event-runtime.json');
  const fixture=read('tests/synthetic/original-engine-event.json');
  assert.equal(runtime.data.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');
  assert.equal(runtime.data.method,'BattleEngine.CreateEventEffect');
  assert.equal(runtime.data.fixtures,fixture.data.fixtures.length);
  assert.equal(runtime.data.exactMatches,runtime.data.fixtures);
  assert.equal(runtime.data.mismatches,0);
  assert.equal(runtime.data.sourceHashes.comparison,hash(comparison.bytes));
  assert.equal(runtime.data.sourceHashes.fixture,hash(fixture.bytes));
  const row=comparison.data.combatModules.find(item=>item.name==='BattleEngine.lua');
  assert.equal(runtime.data.sourceHashes.currentBattleEngine,row.current[0].sha256);
});

test('current PC effect-order orchestration matches the inherited runtime domain',()=>{
  const comparison=read('research/evidence/pc-res144-to-res150-combat-build.json');
  const runtime=read('research/evidence/pc-res150-engine-run-order-runtime.json');
  const fixture=read('tests/synthetic/original-engine-run-order.json');
  assert.equal(runtime.data.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');
  assert.equal(runtime.data.method,'BattleEngine.RunEffectOrder');
  assert.equal(runtime.data.fixtures,fixture.data.fixtures.length);
  assert.equal(runtime.data.exactMatches,runtime.data.fixtures);
  assert.equal(runtime.data.mismatches,0);
  assert.equal(runtime.data.sourceHashes.comparison,hash(comparison.bytes));
  assert.equal(runtime.data.sourceHashes.fixture,hash(fixture.bytes));
  const row=comparison.data.combatModules.find(item=>item.name==='BattleEngine.lua');
  assert.equal(runtime.data.sourceHashes.currentBattleEngine,row.current[0].sha256);
});

test('current PC use-card dispatch matches the inherited runtime domain',()=>{
  const comparison=read('research/evidence/pc-res144-to-res150-combat-build.json');
  const runtime=read('research/evidence/pc-res150-engine-use-card-runtime.json');
  const fixture=read('tests/synthetic/original-engine-use-card.json');
  assert.equal(runtime.data.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');
  assert.equal(runtime.data.method,'BattleEngine.lg_UseCard');
  assert.equal(runtime.data.fixtures,fixture.data.fixtures.length);
  assert.equal(runtime.data.exactMatches,runtime.data.fixtures);
  assert.equal(runtime.data.mismatches,0);
  assert.equal(runtime.data.sourceHashes.comparison,hash(comparison.bytes));
  assert.equal(runtime.data.sourceHashes.fixture,hash(fixture.bytes));
  const row=comparison.data.combatModules.find(item=>item.name==='BattleEngine.lua');
  assert.equal(runtime.data.sourceHashes.currentBattleEngine,row.current[0].sha256);
});

test('current PC selected replay-record constructors match the inherited runtime domain',()=>{
  const comparison=read('research/evidence/pc-res144-to-res150-combat-build.json');
  const runtime=read('research/evidence/pc-res150-battle-record-runtime.json');
  const fixture=read('tests/synthetic/original-battle-record.json');
  assert.equal(runtime.data.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');
  assert.equal(runtime.data.fixtures,fixture.data.fixtures.length+fixture.data.queueFixtures.length);
  assert.deepEqual(runtime.data.domains,{frame:{fixtures:10,exactMatches:10},queue:{fixtures:4,exactMatches:4}});
  assert.equal(runtime.data.exactMatches,runtime.data.fixtures);
  assert.equal(runtime.data.mismatches,0);
  assert.equal(runtime.data.sourceHashes.comparison,hash(comparison.bytes));
  assert.equal(runtime.data.sourceHashes.fixture,hash(fixture.bytes));
  const row=comparison.data.combatModules.find(item=>item.name==='BattleRecord.lua');
  assert.equal(runtime.data.sourceHashes.currentBattleRecord,row.current[0].sha256);
});

test('current PC card and Strike-tag target path matches the inherited runtime domain',()=>{
  const comparison=read('research/evidence/pc-res144-to-res150-combat-build.json');
  const runtime=read('research/evidence/pc-res150-card-target-runtime.json');
  const fixture=read('tests/synthetic/original-card-target.json');
  const mixedFixture=read('tests/synthetic/original-card-target-mixed.json');
  assert.equal(runtime.data.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');
  assert.equal(runtime.data.fixtures,fixture.data.fixtures.length+mixedFixture.data.fixtures.length);
  assert.equal(runtime.data.exactMatches,runtime.data.fixtures);
  assert.equal(runtime.data.mismatches,0);
  assert.equal(runtime.data.sourceHashes.comparison,hash(comparison.bytes));
  assert.equal(runtime.data.sourceHashes.fixture,hash(fixture.bytes));
  assert.equal(runtime.data.sourceHashes.mixedFixture,hash(mixedFixture.bytes));
  for(const name of ['BattleConst.lua','BattleUtilServer.lua','BattleCmdServer.lua']){
    const row=comparison.data.combatModules.find(item=>item.name===name);
    assert.equal(runtime.data.sourceHashes['current'+name.replace('.lua','')],row.current[0].sha256);
  }
});

test('current PC offensive input assembly matches inherited no-card and card domains',()=>{
  const comparison=read('research/evidence/pc-res144-to-res150-combat-build.json');
  const runtime=read('research/evidence/pc-res150-offensive-setup-runtime.json');
  const noCard=read('tests/synthetic/original-offensive-setup.json');
  const card=read('tests/synthetic/original-card-setup.json');
  assert.equal(runtime.data.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');
  assert.equal(runtime.data.fixtures,noCard.data.fixtures.length+card.data.fixtures.length);
  assert.deepEqual(runtime.data.domains,{noCard:{fixtures:549,exactMatches:549,mismatches:0},card:{fixtures:330,exactMatches:330,mismatches:0}});
  assert.equal(runtime.data.exactMatches,runtime.data.fixtures);
  assert.equal(runtime.data.mismatches,0);
  assert.equal(runtime.data.sourceHashes.comparison,hash(comparison.bytes));
  assert.equal(runtime.data.sourceHashes.noCardFixture,hash(noCard.bytes));
  assert.equal(runtime.data.sourceHashes.cardFixture,hash(card.bytes));
});

test('current PC BeHit through HP mutation matches the inherited runtime domain',()=>{
  const comparison=read('research/evidence/pc-res144-to-res150-combat-build.json');
  const runtime=read('research/evidence/pc-res150-behit-hp-runtime.json');
  const fixture=read('tests/synthetic/original-behit-hp.json');
  assert.equal(runtime.data.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');
  assert.equal(runtime.data.fixtures,fixture.data.fixtures.length);
  assert.equal(runtime.data.exactMatches,runtime.data.fixtures);
  assert.equal(runtime.data.mismatches,0);
  assert.equal(runtime.data.sourceHashes.comparison,hash(comparison.bytes));
  assert.equal(runtime.data.sourceHashes.fixture,hash(fixture.bytes));
  const row=comparison.data.combatModules.find(item=>item.name==='BattlePropertyServer.lua');
  assert.equal(runtime.data.sourceHashes.currentBattlePropertyServer,row.current[0].sha256);
});

test('current PC Active repetition routing matches the inherited runtime domain',()=>{
  const comparison=read('research/evidence/pc-res144-to-res150-combat-build.json');
  const runtime=read('research/evidence/pc-res150-active-routing-runtime.json');
  const fixture=read('tests/synthetic/original-active-damage-routing.json');
  assert.equal(runtime.data.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');
  assert.equal(runtime.data.fixtures,fixture.data.fixtures.length);
  assert.equal(runtime.data.exactMatches,runtime.data.fixtures);
  assert.equal(runtime.data.mismatches,0);
  assert.equal(runtime.data.sourceHashes.comparison,hash(comparison.bytes));
  assert.equal(runtime.data.sourceHashes.fixture,hash(fixture.bytes));
  const row=comparison.data.combatModules.find(item=>item.name==='BEActiveDamage.lua');
  assert.equal(runtime.data.sourceHashes.currentBEActiveDamage,row.current[0].sha256);
});
