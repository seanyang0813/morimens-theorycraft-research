import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const read=name=>{const bytes=readFileSync(new URL(`../${name}`,import.meta.url));return {bytes,data:JSON.parse(bytes)}};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

test('original connected HP listener preserves eligibility, signed delta and associator',()=>{
  const rows=read('tests/synthetic/original-connected-hp-listener.json').data.fixtures;
  assert.deepEqual(rows.map(row=>row.expected.triggered.length),[1,0,0,1,1]);
  assert.deepEqual(rows.flatMap(row=>row.expected.triggered.map(hit=>hit.triggerValue)),[-300,200,-125]);
  assert.ok(rows.every(row=>row.expected.effectEligible));
  assert.ok(rows.flatMap(row=>row.expected.triggered).every(hit=>hit.sameAssociator));
});

test('resource-150 connected HP listener matches the inherited fixture domain',()=>{
  const runtime=read('research/evidence/pc-res150-connected-hp-listener-runtime.json');const fixture=read('tests/synthetic/original-connected-hp-listener.json');const scheduler=read('research/evidence/pc-res150-scheduler-modules.json');
  assert.equal(runtime.data.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');assert.equal(runtime.data.fixtures,5);assert.equal(runtime.data.exactMatches,5);assert.equal(runtime.data.mismatches,0);assert.equal(runtime.data.sourceHashes.fixture,hash(fixture.bytes));assert.equal(runtime.data.sourceHashes.schedulerComparison,hash(scheduler.bytes));
});
