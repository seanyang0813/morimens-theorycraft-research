import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const read=name=>{const bytes=readFileSync(new URL(`../${name}`,import.meta.url));return {bytes,data:JSON.parse(bytes)}};
test('resource-150 selected scheduler modules are byte-identical to resource 144',()=>{
  const evidence=read('research/evidence/pc-res150-scheduler-modules.json');
  const comparison=read('research/evidence/pc-res144-to-res150-combat-build.json');
  assert.equal(evidence.data.sourceHashes.buildComparison,createHash('sha256').update(comparison.bytes).digest('hex'));
  assert.equal(evidence.data.status,'SELECTED_MODULES_IDENTICAL');
  assert.deepEqual(evidence.data.modules.map(row=>row.name),['BattleEffectServer.lua','BattleEffectMgrServer.lua','BEFunctionEffect.lua','BEAttachPostAction.lua','BESendEvent.lua','BattleLogicEvent.lua']);
  for(const row of evidence.data.modules){assert.equal(row.status,'IDENTICAL');assert.deepEqual(row.current,row.baseline);}
});
