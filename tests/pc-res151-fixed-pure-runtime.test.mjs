import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync(new URL('../research/evidence/pc-res151-fixed-pure-runtime.json',import.meta.url)));

test('installed Fixed and Pure pre-hit runtime comparison stays bounded',()=>{
  assert.equal(report.analysisTrack,'mechanics');
  assert.equal(report.status,'EXACT_MATCH_IN_SYNTHETIC_FIXTURE_DOMAIN');
  assert.equal(report.installedBuild,'pc-res151-build51');
  assert.equal(report.results.Fixed.fixtures,372);
  assert.equal(report.results.Fixed.exactMatches,372);
  assert.equal(report.results.Fixed.mismatches,0);
  assert.equal(report.results.Pure.fixtures,322);
  assert.equal(report.results.Pure.exactMatches,322);
  assert.equal(report.results.Pure.mismatches,0);
  assert.ok(report.limitations.some(line=>line.includes('not a live battle or independent gameplay holdout')));
  assert.ok(report.limitations.some(line=>line.includes('HP/shield resolution')));
  assert.ok(Object.values(report.sourceHashes.modules).every(hash=>/^[0-9a-f]{64}$/.test(hash)));
});
