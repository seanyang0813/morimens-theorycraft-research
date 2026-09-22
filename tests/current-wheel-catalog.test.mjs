import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {advanceDoomsdayAfterUseCard,advanceLightOfIntellectAfterKeeperSkill,advanceArachneAfterPursuit} from '../engine/wheel-trigger-transitions.mjs';

const load=(root,name)=>JSON.parse(readFileSync(new URL(`${root}/${name}.json`,import.meta.url)));
const old={State:load('../research/extracted/config','State'),Cmd:load('../research/extracted/config','Cmd')};
const current={State:load('../research/observations/current-res150-build51/modules','State'),Cmd:load('../research/observations/current-res150-build51/modules','Cmd')};
const withoutSort=value=>{const copy=JSON.parse(JSON.stringify(value));const visit=node=>{if(!node||typeof node!=='object')return;delete node.BaseSortID;for(const child of Object.values(node))visit(child);};visit(copy);return copy;};

test('current Wheel rows preserve recovered transitions with one explicit attack-property migration',()=>{
  for(const id of [123520,134231,134313,123518,124066,134383,134382,70350])assert.deepEqual(withoutSort(current.State[id]),withoutSort(old.State[id]),`State ${id}`);
  for(const id of [124065,124022,134385,134386])assert.deepEqual(withoutSort(current.Cmd[id]),withoutSort(old.Cmd[id]),`Cmd ${id}`);
  const migrated=withoutSort(old.State['123521']);migrated.DescPara['2']='math.ceil(StateOwner.AtkForce*StateArg2*0.01)';migrated.TriggerPara1='math.ceil(StateOwner.AtkForce*StateArg2*0.01)';assert.deepEqual(withoutSort(current.State['123521']),migrated);
});

test('current Wheel transitions expose their catalog source and retain caps',()=>{
  const doomsday=advanceDoomsdayAfterUseCard({schemaVersion:1,kind:'morimens-after-use-card-wheel-trigger',build:'pc-res150-build51',wheelId:'wheel-0029',refinementLevel:3,cardType:'Card_Strike',ownerAttack:1001,counter:0,strikecardDamagePlus:0});assert.equal(doomsday.ownerAttackSourceProperty,'AtkForce');assert.equal(doomsday.transition.addedStrikecardDamagePlus,251);
  const light=advanceLightOfIntellectAfterKeeperSkill({schemaVersion:1,kind:'morimens-after-keeper-skill-wheel-trigger',build:'pc-res150-build51',wheelId:'wheel-0117',refinementLevel:3,counter:0,roll:100,matchingStrikeAvailable:true});assert.equal(light.transition.chancePercent,100);assert.equal(light.transition.movedCardCount,1);
  const arachne=advanceArachneAfterPursuit({schemaVersion:1,kind:'morimens-after-pursuit-wheel-triggers',build:'pc-res150-build51',ownerUid:56,pursuitOwnerUid:56,basicDamagePer:0,wheels:[{slotId:'signature',wheelId:'wheel-0128',refinementLevel:3,triggersUsed:0},{slotId:'secondary',wheelId:'wheel-0132',refinementLevel:3,triggersUsed:0}]});assert.equal(arachne.addedBasicDamagePer,55);assert.deepEqual(arachne.transitions.map(row=>row.triggersUsedAfter),[1,1]);
});
