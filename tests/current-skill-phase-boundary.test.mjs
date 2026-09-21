import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync(new URL('../research/evidence/pc-res150-skill-phase-boundary-runtime.json',import.meta.url)));

test('current selected command/parser skill-phase boundaries match baseline',()=>{
  assert.equal(report.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');
  assert.equal(report.fixtures,137);
  assert.equal(report.exactMatches,137);
  assert.equal(report.mismatches,0);
  assert.deepEqual(report.domains,{
    phaseFinish:{fixtures:4,exactMatches:4,mismatches:0},
    stateOwnerTarget:{fixtures:5,exactMatches:5,mismatches:0},
    argumentLookup:{fixtures:20,exactMatches:20,mismatches:0},
    skillArguments:{fixtures:108,exactMatches:108,mismatches:0},
  });
});
