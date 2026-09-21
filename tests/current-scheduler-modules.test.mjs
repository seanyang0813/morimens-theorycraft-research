import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const read=name=>{const bytes=readFileSync(new URL(`../${name}`,import.meta.url));return {bytes,data:JSON.parse(bytes)}};
test('resource-150 core scheduler, event dispatcher and fatal-damage modules retain identity while two death modules changed',()=>{
  const evidence=read('research/evidence/pc-res150-scheduler-modules.json');
  const comparison=read('research/evidence/pc-res144-to-res150-combat-build.json');
  assert.equal(evidence.data.sourceHashes.buildComparison,createHash('sha256').update(comparison.bytes).digest('hex'));
  assert.equal(evidence.data.status,'REVALIDATION_REQUIRED');
  assert.equal(evidence.data.coreSchedulerStatus,'SELECTED_MODULES_IDENTICAL');
  assert.equal(evidence.data.identicalModules,11);
  assert.equal(evidence.data.changedOrMissingModules,2);
  assert.deepEqual(evidence.data.modules.map(row=>row.name),['BattleEffectServer.lua','BattleEffectMgrServer.lua','BEFunctionEffect.lua','BEAttachPostAction.lua','BESendEvent.lua','BattleLogicEvent.lua','BattleEventMgr.lua','Table.lua','BSTHpChanged.lua','BattleStateTriggerServer.lua','BERoleDeadlyDamage.lua','BERoleDie.lua','BattleUnitMonster.lua']);
  for(const row of evidence.data.modules.slice(0,11)){assert.equal(row.status,'IDENTICAL');assert.deepEqual(row.current,row.baseline);}
  assert.deepEqual(evidence.data.modules.slice(11).map(row=>row.status),['CHANGED_OR_MISSING','CHANGED_OR_MISSING']);
});
