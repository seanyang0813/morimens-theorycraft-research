import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assembleKnownBuildComponents} from '../engine/build-component-assembly.mjs';

const catalog=JSON.parse(readFileSync(new URL('../website/dist/build-catalog.json',import.meta.url),'utf8'));
const clientData=JSON.parse(readFileSync(new URL('../website/dist/client-build-data.json',import.meta.url),'utf8'));
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
