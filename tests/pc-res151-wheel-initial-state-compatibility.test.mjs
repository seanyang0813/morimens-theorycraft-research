import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync(new URL('../research/evidence/pc-res151-wheel-initial-state-compatibility.json',import.meta.url)));

test('installed Wheel initial-state audit preserves changed and absent links as blockers',()=>{
  assert.equal(report.kind,'MORIMENS_PC_RES151_WHEEL_INITIAL_STATE_COMPATIBILITY');
  assert.equal(report.analysisTrack,'mechanics');
  assert.equal(report.status,'PARTIAL_COMPATIBILITY');
  assert.equal(report.currentBuild,'pc-res151-build51');
  assert.equal(report.counts.historicallyUniqueWheelLinks,141);
  assert.equal(report.counts.unchangedItemAttributeRows,139);
  assert.equal(report.counts.INITIAL_DIRECT_PROPERTY_UNCHANGED,136);
  assert.equal(report.counts.INITIAL_DIRECT_PROPERTY_CHANGED,3);
  assert.equal(report.counts.HISTORICAL_ITEM_ABSENT,2);
  assert.equal(report.exceptions.length,5);
  assert.equal(['INITIAL_DIRECT_PROPERTY_UNCHANGED','INITIAL_DIRECT_PROPERTY_CHANGED','LINKED_STATE_ABSENT','ITEM_INITIAL_STATE_LINK_CHANGED','HISTORICAL_ITEM_ABSENT'].reduce((sum,key)=>sum+report.counts[key],0),141);
  assert.deepEqual(new Set(report.exceptions.map(row=>row.status)),new Set(['INITIAL_DIRECT_PROPERTY_CHANGED','HISTORICAL_ITEM_ABSENT']));
  for(const hash of Object.values(report.sourceHashes))assert.match(hash,/^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(report).includes('StateOwner.'),false);
});
