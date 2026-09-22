import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync(new URL('../research/evidence/replay-capture-round-003.json',import.meta.url),'utf8'));

test('third replay capture round is retrospective PvE regression evidence without holdout credit',()=>{
  assert.equal(report.analysisTrack,'verification');assert.equal(report.identifiersPublished,false);assert.equal(report.rawArtifactsPublished,false);
  assert.deepEqual(report.totals,{replays:102,records:61199,events:1547959,cardUses:12049,hits:22034,completeHitSnapshots:7948,unknownCommands:0,unknownEvents:0,retrospectiveActiveCandidates:1573,deterministicExactChecks:172,deterministicMismatches:0,exactRngBranchConsistencyChecks:1401,rngBranchMismatches:0,completeHitTargetRoleTypes:{Player:2399,Monster:5549},combatDomains:{PVE_MONSTER_TARGETS:102}});
  assert.equal(report.blindSelection.eligibleReplays,0);assert.equal(report.blindSelection.frozenPredictions,0);assert.ok(report.claimBoundary.forbidden.includes('independent gameplay holdout credit'));
});
