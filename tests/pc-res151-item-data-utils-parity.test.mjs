import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync(new URL('../research/evidence/pc-res151-item-data-utils-parity.json',import.meta.url)));

test('installed ItemDataUtils parity remains a bounded static mechanics finding',()=>{
  assert.equal(report.analysisTrack,'mechanics');
  assert.equal(report.status,'FOCUSED_FUNCTION_BODIES_EQUAL');
  assert.deepEqual(report.builds,['pc-res144-build51','pc-res151-build51']);
  assert.deepEqual(report.directFunctions,{compared:182,equal:178,changed:4,changedPrototypeIndices:[27,132,133,155]});
  assert.deepEqual(report.focusedFunctions.map(row=>row.prototypeIndex),[71,111,112,113,114]);
  assert.ok(report.focusedFunctions.every(row=>row.bodyEqual));
  assert.ok(report.limitations.some(line=>line.includes('does not establish installed enhancement scaling')));
  assert.ok(report.limitations.some(line=>line.includes('not gameplay validation')));
  assert.ok(Object.values(report.sourceHashes).every(hash=>/^[0-9a-f]{64}$/.test(hash)));
});
