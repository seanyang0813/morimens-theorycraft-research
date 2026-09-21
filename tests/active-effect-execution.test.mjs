import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync(new URL('./synthetic/original-active-effect-execution.json',import.meta.url)));

test('original Active effect executes through child function-effect creation',()=>{
  assert.equal(report.fixtures.length,4);
  const one=report.fixtures.find(row=>row.input.name==='one-hit').expected;
  assert.equal(one.eligible,true);
  assert.equal(one.executed,true);
  assert.deepEqual(one.effect,{uid:101,parentEffectUid:0,preTriggerTime:12.5,totalEffectTimes:1,leftEffectTimes:0});
  assert.deepEqual(one.childConfigs,[{targetUid:20}]);
  assert.deepEqual(one.childPreTriggers,[null]);
  assert.deepEqual(one.delays,[.1,0]);
  const percent=report.fixtures.find(row=>row.input.name==='percent-repeat').expected;
  assert.equal(percent.effect.totalEffectTimes,3);
  assert.equal(percent.effect.leftEffectTimes,1);
  assert.deepEqual(percent.delays,[.5,0,.25]);
  const skipped=report.fixtures.find(row=>row.input.name==='skip-phase').expected;
  assert.deepEqual(skipped.delays,[.5,0,0]);
});
