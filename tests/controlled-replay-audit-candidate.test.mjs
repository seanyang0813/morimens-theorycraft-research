import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync('research/evidence/controlled-pve-retrospective-audit-004.json','utf8'));

test('controlled replay retrospective audit remains review-pending and identifier-free',()=>{
  assert.equal(report.kind,'MORIMENS_CONTROLLED_REPLAY_RETROSPECTIVE_AUDIT_CANDIDATE');
  assert.equal(report.status,'SAME_BATTLE_REVIEW_PENDING');assert.equal(report.analysisTrack,'verification');
  assert.equal(report.calculationBuild,'pc-res151-build51');assert.equal(report.recordedCombatBuild,null);
  assert.equal(report.privateAuditCommitment.identifiersPublished,false);
  assert.deepEqual(report.totals,{records:202,events:2973,cardUses:30,hits:77,completeHitSnapshots:77,retrospectiveActiveCandidates:6,deterministicExactChecks:0,deterministicMismatches:0,exactRngBranchConsistencyChecks:6,rngBranchMismatches:0});
  assert.equal(report.excludedHits.reduce((sum,row)=>sum+row.count,0),71);
  assert.ok(report.limitations.some(value=>value.includes('cannot receive holdout or publication credit')));
});
