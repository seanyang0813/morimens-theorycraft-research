import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const read=name=>{const bytes=readFileSync(new URL(`../${name}`,import.meta.url));return {bytes,data:JSON.parse(bytes)}};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

test('original connected event effects preserve payload identity and ordered listener delivery',()=>{
  const fixture=read('tests/synthetic/original-connected-event-listener.json').data;
  assert.equal(fixture.fixtures.length,4);
  for(const row of fixture.fixtures){
    assert.equal(row.expected.eligible,true);
    assert.equal(row.expected.effectDeleted,true);
    assert.equal(row.expected.runEffectNum,1);
    assert.deepEqual(row.expected.listenerTrace.map(item=>item.listener),['low','head','high']);
    assert.ok(row.expected.listenerTrace.every(item=>item.samePayload));
    assert.ok(row.expected.listenerTrace.every(item=>item.token===row.input.token));
    const expectedAuto=row.input.explicitAuto??row.input.autoBattle;
    assert.ok(row.expected.listenerTrace.every(item=>item.isAutoOp===expectedAuto));
  }
});

test('resource-150 connected event delivery matches the inherited fixture domain',()=>{
  const runtime=read('research/evidence/pc-res150-connected-event-listener-runtime.json');
  const fixture=read('tests/synthetic/original-connected-event-listener.json');
  const scheduler=read('research/evidence/pc-res150-scheduler-modules.json');
  assert.equal(runtime.data.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');
  assert.equal(runtime.data.fixtures,fixture.data.fixtures.length);
  assert.equal(runtime.data.exactMatches,runtime.data.fixtures);
  assert.equal(runtime.data.mismatches,0);
  assert.equal(runtime.data.sourceHashes.fixture,hash(fixture.bytes));
  assert.equal(runtime.data.sourceHashes.schedulerComparison,hash(scheduler.bytes));
  for(const name of ['BattleEffectServer.lua','BattleEffectMgrServer.lua','BESendEvent.lua','BattleLogicEvent.lua','BattleEventMgr.lua','Table.lua']){
    const row=scheduler.data.modules.find(item=>item.name===name);
    assert.equal(row.status,'IDENTICAL');
    assert.deepEqual(row.current,row.baseline);
  }
});
