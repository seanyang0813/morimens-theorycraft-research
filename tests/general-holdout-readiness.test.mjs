import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync(new URL('../research/evidence/general-holdout-readiness.json',import.meta.url)));

test('general deterministic readiness is retrospective selection evidence only',()=>{
  assert.equal(report.analysisTrack,'verification');
  assert.equal(report.status,'RETROSPECTIVE_SELECTION_REQUIRES_FRESH_CONTROLLED_RUN');
  assert.equal(report.corpus.replays,102);
  assert.equal(report.corpus.completeHitSnapshots,7948);
  assert.equal(report.deterministicExactHits,182);
  assert.equal(report.deterministicMismatches,0);
  assert.equal(report.characters.length,7);
  assert.equal(report.skills.length,15);
  assert.equal(report.characters.reduce((sum,row)=>sum+row.exactHitSnapshots,0),182);
  assert.equal(report.skills.reduce((sum,row)=>sum+row.exactHitSnapshots,0),182);
  assert.equal(report.characters.find(row=>row.name==='Kathigu-Ra').exactHitSnapshots,72);
  assert.equal(report.characters.find(row=>row.name==='Mouchette').exactHitSnapshots,69);
  assert.ok(report.skills.every(row=>row.capturedCritChanceCeilRange[0]>=100));
  assert.match(report.corpus.privateAuditSha256,/^[0-9a-f]{64}$/);
  assert.equal(report.corpus.identifiersPublished,false);
  assert.ok(report.limitations.some(text=>text.includes('none is an independent holdout')));
});
