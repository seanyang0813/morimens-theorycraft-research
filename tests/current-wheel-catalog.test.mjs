import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {advanceDoomsdayAfterUseCard,advanceLightOfIntellectAfterKeeperSkill,advanceArachneAfterPursuit} from '../engine/wheel-trigger-transitions.mjs';
import {createHash} from 'node:crypto';

const load=(root,name)=>JSON.parse(readFileSync(new URL(`${root}/${name}.json`,import.meta.url)));
const old={State:load('../research/extracted/config','State'),Cmd:load('../research/extracted/config','Cmd')};
const current={State:load('../research/observations/current-res150-build51/modules','State'),Cmd:load('../research/observations/current-res150-build51/modules','Cmd')};
const report=JSON.parse(readFileSync(new URL('../research/evidence/pc-res144-to-res150-wheel-transitions.json',import.meta.url)));
const sha=url=>createHash('sha256').update(readFileSync(new URL(url,import.meta.url))).digest('hex');
const withoutSort=value=>{const copy=JSON.parse(JSON.stringify(value));const visit=node=>{if(!node||typeof node!=='object')return;delete node.BaseSortID;for(const child of Object.values(node))visit(child);};visit(copy);return copy;};

test('current Wheel rows preserve recovered transitions with one explicit attack-property migration',()=>{
  for(const id of [123520,134231,134313,123518,124066,134383,134382,70350])assert.deepEqual(withoutSort(current.State[id]),withoutSort(old.State[id]),`State ${id}`);
  for(const id of [124065,124022,134385,134386])assert.deepEqual(withoutSort(current.Cmd[id]),withoutSort(old.Cmd[id]),`Cmd ${id}`);
  const migrated=withoutSort(old.State['123521']);migrated.DescPara['2']='math.ceil(StateOwner.AtkForce*StateArg2*0.01)';migrated.TriggerPara1='math.ceil(StateOwner.AtkForce*StateArg2*0.01)';assert.deepEqual(withoutSort(current.State['123521']),migrated);
});

test('sanitized current-Wheel comparison stays bound to the audited private catalogs',()=>{
  assert.equal(report.status,'SUPPORTED_WITH_EXPLICIT_ATTACK_PROPERTY_MIGRATION');assert.deepEqual(report.summary,{stateRows:9,commandRows:4,gameplayEqualRows:12,attackPropertyMigrationRows:1,unexpectedRows:0});
  assert.deepEqual(report.sourceHashes,{beforeState:sha('../research/extracted/config/State.json'),afterState:sha('../research/observations/current-res150-build51/modules/State.json'),beforeCmd:sha('../research/extracted/config/Cmd.json'),afterCmd:sha('../research/observations/current-res150-build51/modules/Cmd.json')});
});

test('current Wheel transitions expose their catalog source and retain caps',()=>{
  const doomsday=advanceDoomsdayAfterUseCard({schemaVersion:1,kind:'morimens-after-use-card-wheel-trigger',build:'pc-res150-build51',wheelId:'wheel-0029',refinementLevel:3,cardType:'Card_Strike',ownerAttack:1001,counter:0,strikecardDamagePlus:0});assert.equal(doomsday.ownerAttackSourceProperty,'AtkForce');assert.equal(doomsday.transition.addedStrikecardDamagePlus,251);
  const light=advanceLightOfIntellectAfterKeeperSkill({schemaVersion:1,kind:'morimens-after-keeper-skill-wheel-trigger',build:'pc-res150-build51',wheelId:'wheel-0117',refinementLevel:3,counter:0,roll:100,matchingStrikeAvailable:true});assert.equal(light.transition.chancePercent,100);assert.equal(light.transition.movedCardCount,1);
  const arachne=advanceArachneAfterPursuit({schemaVersion:1,kind:'morimens-after-pursuit-wheel-triggers',build:'pc-res150-build51',ownerUid:56,pursuitOwnerUid:56,basicDamagePer:0,wheels:[{slotId:'signature',wheelId:'wheel-0128',refinementLevel:3,triggersUsed:0},{slotId:'secondary',wheelId:'wheel-0132',refinementLevel:3,triggersUsed:0}]});assert.equal(arachne.addedBasicDamagePer,55);assert.deepEqual(arachne.transitions.map(row=>row.triggersUsedAfter),[1,1]);
});

test('installed resource-151 Wheel transitions retain resource-150 semantics',()=>{
  const doomsday=advanceDoomsdayAfterUseCard({schemaVersion:1,kind:'morimens-after-use-card-wheel-trigger',build:'pc-res151-build51',wheelId:'wheel-0029',refinementLevel:3,cardType:'Card_Strike',ownerAttack:1001,counter:0,strikecardDamagePlus:0});assert.equal(doomsday.ownerAttackSourceProperty,'AtkForce');assert.equal(doomsday.transition.addedStrikecardDamagePlus,251);
  const light=advanceLightOfIntellectAfterKeeperSkill({schemaVersion:1,kind:'morimens-after-keeper-skill-wheel-trigger',build:'pc-res151-build51',wheelId:'wheel-0117',refinementLevel:3,counter:0,roll:100,matchingStrikeAvailable:true});assert.equal(light.transition.movedCardCount,1);
  const arachne=advanceArachneAfterPursuit({schemaVersion:1,kind:'morimens-after-pursuit-wheel-triggers',build:'pc-res151-build51',ownerUid:56,pursuitOwnerUid:56,basicDamagePer:0,wheels:[{slotId:'signature',wheelId:'wheel-0128',refinementLevel:3,triggersUsed:0},{slotId:'secondary',wheelId:'wheel-0132',refinementLevel:3,triggersUsed:0}]});assert.equal(arachne.addedBasicDamagePer,55);
});
