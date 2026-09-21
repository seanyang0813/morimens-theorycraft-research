import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync(new URL('../research/evidence/replay-catalog-build-attribution.json',import.meta.url)));
const awake=JSON.parse(readFileSync(new URL('../research/evidence/pc-awake-card-command-audit.json',import.meta.url)));

test('replay embedded catalogs discriminate pinned PC resource builds',()=>{
  assert.equal(report.kind,'MORIMENS_REPLAY_CATALOG_BUILD_ATTRIBUTION');
  assert.equal(report.replays.length,42);
  assert.deepEqual(report.sourceHashes['pc-res144-build51'],{
    Cmd:awake.sourceHashes['pc-res144-build51'].cmdExport,
    Skill:awake.sourceHashes['pc-res144-build51'].skillExport,
  });
  assert.deepEqual(report.sourceHashes['pc-res150-build51'],{
    Cmd:awake.sourceHashes['pc-res150-build51'].cmdExport,
    Skill:awake.sourceHashes['pc-res150-build51'].skillExport,
  });
  const current=report.replays.filter(row=>row.classification==='PC_RES150_BUILD51_CATALOG_MATCH');
  assert.deepEqual(current.map(row=>row.observationId),['replay-batch-02','replay-batch-10','replay-batch-43']);
  for(const row of current){assert.equal(row.baselineExclusiveRows,0);assert.equal(row.unmatchedRows,0);assert.ok(row.currentExclusiveRows>0);}
  const baseline=report.replays.filter(row=>row.classification==='PC_RES144_BUILD51_CATALOG_MATCH');
  assert.ok(baseline.length>30);
  for(const row of baseline){assert.equal(row.currentExclusiveRows,0);assert.equal(row.unmatchedRows,0);assert.ok(row.baselineExclusiveRows>0);}
  assert.doesNotMatch(JSON.stringify(report),/playerUid|playerName|battleUid|battleUuid|gameLogBattleUid|replayKey/i);
});
