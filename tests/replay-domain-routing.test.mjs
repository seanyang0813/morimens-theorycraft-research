import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>JSON.parse(readFileSync(new URL(`../research/evidence/${name}`,import.meta.url),'utf8'));

test('budget-domain routing fails closed without a pure PvE capture',()=>{
  const report=read('replay-budget-domain-routing.json');
  assert.equal(report.analysisTrack,'budget-scouting');assert.equal(report.identifiersPublished,false);
  assert.equal(report.captureCount,69);assert.deepEqual(report.combatDomains,{MIXED_OR_UNKNOWN_TARGETS:20,PVP_PLAYER_TARGETS:49});
  assert.deepEqual(report.completeHitTargetRoleTypes,{Monster:1117,Player:1345});assert.equal(report.completeHitSnapshots,2462);
  assert.equal(report.pveBudgetEligibleCaptureCount,0);assert.equal(report.pveComparableGroupCount,0);
  assert.ok(report.claimBoundary.forbidden.includes('cheese classification'));assert.ok(report.claimBoundary.forbidden.includes('theorycraft conclusion'));
});

test('regression-domain routing keeps mixed records distinct from PvE evidence',()=>{
  const report=read('replay-regression-domain-routing.json');
  assert.equal(report.analysisTrack,'verification');assert.equal(report.identifiersPublished,false);assert.equal(report.replayCount,42);
  assert.deepEqual(report.domains.PVP_PLAYER_TARGETS,{replays:23,completeHitSnapshots:554,retrospectiveActiveCandidates:0});
  assert.deepEqual(report.domains.MIXED_OR_UNKNOWN_TARGETS,{replays:19,completeHitSnapshots:1250,retrospectiveActiveCandidates:428});
  assert.equal(report.totalRetrospectiveActiveCandidates,428);assert.equal(report.publicationCredit,false);
  assert.ok(report.claimBoundary.forbidden.includes('whole-record PvE classification'));assert.ok(report.claimBoundary.forbidden.includes('budget ranking'));
});
