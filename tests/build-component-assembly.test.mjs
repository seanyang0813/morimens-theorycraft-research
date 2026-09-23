import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assembleKnownBuildComponents} from '../engine/build-component-assembly.mjs';

const catalog=JSON.parse(readFileSync(new URL('../website/dist/build-catalog.json',import.meta.url),'utf8'));
const clientData=JSON.parse(readFileSync(new URL('../website/dist/client-build-data.json',import.meta.url),'utf8'));
const installedData=JSON.parse(readFileSync(new URL('../research/evidence/client-build-data-res151.json',import.meta.url),'utf8'));
const installedWheelCompatibility=JSON.parse(readFileSync(new URL('../research/evidence/pc-res151-wheel-initial-state-compatibility.json',import.meta.url),'utf8'));
const resolvableCharacter=catalog.characters.find(row=>clientData.characters.some(client=>client.characterId===row.id));
const wheel=catalog.wheels.find(row=>row.rarity==='SSR'&&row.mainstatKey==='REALM_MASTERY');
const talent=clientData.characters.find(row=>row.characterId===resolvableCharacter.id).advancementTalents[0];
const plan=()=>({schemaVersion:1,kind:'morimens-build-plan',catalogRevision:catalog.source.revision,clientBuild:'pc-res144-build51',team:[{slotId:'one',characterId:resolvableCharacter.id,level:90,gnosticRank:5,advancementTalentId:talent.clientTalentId,advancementLevel:10,wheelId:wheel.id,wheelEnhanceLevel:15}]});

test('known build assembler emits an auditable contribution ledger without final damage',()=>{
  const result=assembleKnownBuildComponents(plan(),catalog,clientData);
  assert.equal(result.status,'EXPERIMENTAL');
  assert.equal(result.assemblyStatus,'KNOWN_COMPONENTS_RESOLVED');
  assert.equal(result.finalDamage,null);
  assert.deepEqual(result.issues,[]);
  assert.ok(result.members[0].primaryStats.ATK>=result.members[0].primaryBaseStats.ATK);
  assert.equal(result.members[0].advancementTalent.level,10);
  assert.equal(result.members[0].wheelMainstat.value,72);
  assert.equal(result.members[0].contributionLedger.at(-1).sourceKind,'WHEEL_MAINSTAT');
});

test('installed-client build assembler resolves explicit progression without crossing data builds',()=>{
  const input=plan();input.clientBuild='pc-res151-build51';
  const result=assembleKnownBuildComponents(input,catalog,installedData,installedWheelCompatibility);
  assert.equal(result.build,'pc-res151-build51');
  assert.equal(result.assemblyStatus,'KNOWN_COMPONENTS_RESOLVED');
  assert.equal(result.finalDamage,null);
  assert.deepEqual(result.issues,[]);
  assert.equal(result.members[0].wheelMainstat.installedItemCompatibility.itemAttributeRowsEqual,true);
  assert.equal(result.members[0].wheelMainstat.installedEnhancementScalingVerified,false);
  assert.throws(()=>assembleKnownBuildComponents(input,catalog,clientData),/mismatched/);
});

test('installed-client Wheel assembly fails closed for unresolved crosswalk and absent compatibility evidence',()=>{
  const input=plan();input.clientBuild='pc-res151-build51';input.team[0].wheelId='wheel-0027';
  let result=assembleKnownBuildComponents(input,catalog,installedData,installedWheelCompatibility);
  assert.equal(result.assemblyStatus,'INCOMPLETE_INPUT');
  assert.equal(result.members[0].wheelMainstat,null);
  assert.ok(result.issues.some(row=>row.code==='WHEEL_CURRENT_ITEM_UNRESOLVED'));
  assert.equal(result.members[0].contributionLedger.some(row=>row.sourceKind==='WHEEL_MAINSTAT'),false);
  result=assembleKnownBuildComponents(input,catalog,installedData);
  assert.ok(result.issues.some(row=>row.code==='WHEEL_CURRENT_COMPATIBILITY_REQUIRED'));
});

test('unique current Item replacement retains only the supported catalog main-stat preview',()=>{
  const input=plan();input.clientBuild='pc-res151-build51';input.team[0].wheelId='wheel-0178';
  const result=assembleKnownBuildComponents(input,catalog,installedData,installedWheelCompatibility);
  assert.equal(result.assemblyStatus,'KNOWN_COMPONENTS_RESOLVED');
  assert.equal(result.members[0].wheelMainstat.installedItemCompatibility.status,'ITEM_REPLACED_EQUIVALENT_INITIAL_RULE');
  assert.equal(result.members[0].wheelMainstat.installedItemCompatibility.initialDirectPropertiesEqual,true);
  assert.equal(result.members[0].wheelMainstat.installedEnhancementScalingVerified,false);
});

test('unique current-only Wheel can preview a matched main stat without claiming historical passive parity',()=>{
  const input=plan();input.clientBuild='pc-res151-build51';input.team[0].wheelId='wheel-0180';
  const result=assembleKnownBuildComponents(input,catalog,installedData,installedWheelCompatibility);
  assert.equal(result.assemblyStatus,'KNOWN_COMPONENTS_RESOLVED');
  const boundary=result.members[0].wheelMainstat.installedItemCompatibility;
  assert.equal(boundary.status,'CURRENT_ONLY_UNIQUE_ICON_MAINSTAT_BASE_MATCH');
  assert.equal(boundary.catalogMainstatBaseMatches,true);
  assert.equal(boundary.itemAttributeRowsEqual,false);
  assert.equal(boundary.initialDirectPropertiesEqual,null);
  assert.equal(result.finalDamage,null);
});

test('installed-client changed initial direct properties remain explicit beside preserved catalog main stat',()=>{
  const input=plan();input.clientBuild='pc-res151-build51';input.team[0].wheelId='wheel-0030';
  const result=assembleKnownBuildComponents(input,catalog,installedData,installedWheelCompatibility);
  assert.equal(result.assemblyStatus,'KNOWN_COMPONENTS_RESOLVED');
  assert.equal(result.members[0].wheelMainstat.installedItemCompatibility.status,'INITIAL_DIRECT_PROPERTY_CHANGED');
  assert.equal(result.members[0].wheelMainstat.installedItemCompatibility.initialDirectPropertiesEqual,false);
  assert.equal(result.members[0].wheelMainstat.installedEnhancementScalingVerified,false);
  assert.equal(result.finalDamage,null);
});

test('unknown build inputs produce typed issues and are never neutralized',()=>{
  const input=plan();delete input.clientBuild;input.team[0].level=null;input.team[0].gnosticRank=null;input.team[0].advancementTalentId=null;input.team[0].advancementLevel=null;input.team[0].wheelId=null;delete input.team[0].wheelEnhanceLevel;
  const result=assembleKnownBuildComponents(input,catalog,clientData);
  assert.equal(result.assemblyStatus,'INCOMPLETE_INPUT');
  assert.equal(result.members[0].primaryStats,null);
  assert.equal(result.members[0].wheelMainstat,null);
  assert.deepEqual(result.issues.map(row=>row.code),['CLIENT_BUILD_REQUIRED','CHARACTER_LEVEL_REQUIRED','GNOSTIC_RANK_REQUIRED','ADVANCEMENT_TALENT_REQUIRED','ADVANCEMENT_LEVEL_REQUIRED','WHEEL_SELECTION_REQUIRED']);
});

test('unsupported character client identity and level are typed rather than guessed',()=>{
  const input=plan();input.team[0].characterId=clientData.unresolved[0].characterId;input.team[0].level=91;
  const result=assembleKnownBuildComponents(input,catalog,clientData);
  assert.deepEqual(result.issues.slice(0,2).map(row=>row.code),['CHARACTER_LEVEL_UNSUPPORTED','CHARACTER_PRIMARY_UNRESOLVED']);
  assert.equal(result.members[0].primaryStats,null);
});

test('version 2 assembler keeps two Wheel main-stat ledgers and refinement provenance separate',()=>{
  const second=catalog.wheels.find(row=>row.id!==wheel.id&&row.mainstatKey==='REALM_MASTERY');
  const input=plan(),legacy=input.team[0];input.schemaVersion=2;input.team[0]={slotId:legacy.slotId,characterId:legacy.characterId,level:legacy.level,gnosticRank:legacy.gnosticRank,advancementTalentId:legacy.advancementTalentId,advancementLevel:legacy.advancementLevel,wheelSlots:[{slotId:'wheel-a',wheelId:wheel.id,enhanceLevel:15,refinementLevel:3},{slotId:'wheel-b',wheelId:second.id,enhanceLevel:0,refinementLevel:0}]};
  const result=assembleKnownBuildComponents(input,catalog,clientData),member=result.members[0];
  assert.equal(result.assemblyStatus,'KNOWN_COMPONENTS_RESOLVED');
  assert.equal(member.wheelMainstats.length,2);
  assert.deepEqual(member.wheelMainstats.map(row=>row.refinementLevel),[3,0]);
  assert.equal(member.contributionLedger.filter(row=>row.sourceKind==='WHEEL_MAINSTAT').length,2);
});

test('version 2 assembler treats empty Wheel slots as explicit and unknown selected refinement as typed',()=>{
  const input=plan(),legacy=input.team[0];input.schemaVersion=2;input.team[0]={slotId:legacy.slotId,characterId:legacy.characterId,level:legacy.level,gnosticRank:legacy.gnosticRank,advancementTalentId:legacy.advancementTalentId,advancementLevel:legacy.advancementLevel,wheelSlots:[{slotId:'wheel-a',wheelId:wheel.id,enhanceLevel:15,refinementLevel:null},{slotId:'wheel-b',wheelId:null,enhanceLevel:null,refinementLevel:null}]};
  const result=assembleKnownBuildComponents(input,catalog,clientData);
  assert.deepEqual(result.issues.map(row=>row.code),['WHEEL_REFINEMENT_REQUIRED']);
  assert.equal(result.members[0].wheelMainstats.length,1);
});
