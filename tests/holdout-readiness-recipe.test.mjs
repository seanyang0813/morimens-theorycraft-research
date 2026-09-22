import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync('research/evidence/mouchette-holdout-readiness.json','utf8'));

test('Mouchette holdout recipe remains verification planning rather than holdout credit',()=>{
  assert.equal(report.kind,'MORIMENS_HOLDOUT_READINESS_RECIPE');assert.equal(report.analysisTrack,'verification');
  assert.equal(report.status,'RETROSPECTIVE_RECIPE_REQUIRES_FRESH_CONTROLLED_RUN');
  assert.equal(report.character.name,'Mouchette');assert.equal(report.deterministicExactHits,69);assert.equal(report.deterministicMismatches,0);
  assert.deepEqual(report.skills.map(row=>[row.name,row.exactHits]),[['Mortal Blast',17],['Shining Tornado',24],['Dramatic Encounter',27],['Strike',1]]);
  assert.ok(report.skills.every(row=>row.capturedCritChanceCeilRange[0]>=100));
  assert.equal(report.corpus.identifiersPublished,false);
  assert.ok(report.limitations.some(value=>value.includes('not a theorycraft recommendation')));
  assert.ok(report.limitations.some(value=>value.includes('fresh prediction-before-reveal')));
});
