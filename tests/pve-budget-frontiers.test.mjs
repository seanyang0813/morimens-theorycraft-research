import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const text=readFileSync(new URL('../research/evidence/pve-budget-frontiers-round-003.json',import.meta.url),'utf8'),report=JSON.parse(text);

test('PvE budget frontiers publish comparable anonymous roster candidates only',()=>{
  assert.equal(report.analysisTrack,'budget-scouting');assert.equal(report.identifiersPublished,false);assert.equal(report.captureCount,102);assert.equal(report.pveEligibleCaptureCount,102);assert.equal(report.comparisonGroupCount,10);assert.equal(report.frontierCandidateCount,26);
  assert.equal(report.groups.length,10);assert.equal(report.groups.reduce((sum,row)=>sum+row.frontierCandidates.length,0),26);
  for(const group of report.groups){assert.ok(Number.isSafeInteger(group.battleTid));assert.ok(group.comparedRecords>=9);for(const candidate of group.frontierCandidates){assert.equal(candidate.roster.length,4);assert.ok(candidate.roster.every(row=>Number.isSafeInteger(row.awakenerId)&&typeof row.awakenerName==='string'&&Number.isFinite(row.level)));}}
  assert.ok(report.groups.some(group=>group.frontierCandidates.some(candidate=>candidate.investmentSignals.highestCharacterLevel===70&&candidate.investmentSignals.characterLevelSum===255)));
  assert.doesNotMatch(text,/captureLabel|stageId|playerUid|battleUuid|battleUid/);assert.ok(report.claimBoundary.forbidden.includes('cheese classification'));assert.ok(report.claimBoundary.forbidden.includes('damage verification'));
});
