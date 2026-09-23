import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync(new URL('../research/evidence/fixed-replay-consistency.json',import.meta.url)));

test('recorded Fixed hits remain retrospective component evidence',()=>{
  assert.equal(report.analysisTrack,'verification');
  assert.equal(report.status,'EXACT_RETROSPECTIVE_COMPONENT_MATCHES');
  assert.equal(report.recordedCombatBuild,null);
  assert.equal(report.corpus.replaysScanned,102);
  assert.equal(report.corpus.completeFixedHitSnapshots,99);
  assert.equal(report.corpus.identifiersPublished,false);
  assert.deepEqual(report.selection,{sixRowFixedShape:86,eligibleHitSnapshots:85,rejectedHitIdentity:1,otherFixedSnapshotsOutsideShape:13,distinctReplays:1,distinctCardActions:30});
  assert.deepEqual(report.comparison,{exact:85,mismatches:0,boostedBranchHits:0,nonzeroDimensionHits:12,nonzeroFixedTargetHits:1});
  assert.ok(report.limitations.some(line=>line.includes('none is an independent holdout')));
  assert.ok(report.limitations.some(line=>line.includes('one replay')));
  assert.match(report.corpus.privateReplayIndexSha256,/^[0-9a-f]{64}$/);
  assert.match(report.corpus.privateEmbeddedCatalogSha256,/^[0-9a-f]{64}$/);
});
