import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const trigger=JSON.parse(readFileSync(new URL('./synthetic/original-trigger-cmd.json',import.meta.url)));
const connected=JSON.parse(readFileSync(new URL('./synthetic/original-connected-skill-phase.json',import.meta.url)));

test('original TriggerCmd replaces its effect list and shares trigger data across child pre-triggers',()=>{
  assert.equal(trigger.fixtures.length,5);
  const ordinary=trigger.fixtures.find(row=>row.input.name==='ordinary').expected;
  assert.equal(ordinary.effectCount,2);
  assert.deepEqual(ordinary.preTriggers.map(row=>row.effect),[1,2]);
  assert.deepEqual(ordinary.preTriggers.map(row=>row.seenProbe),[null,99]);
  assert.deepEqual(ordinary.preTriggers.map(row=>row.token),[7,7]);
  const pre=trigger.fixtures.find(row=>row.input.name==='pre-command').expected;
  assert.equal(pre.trace.includes('IncreaseActionIndex'),false);
});

test('original phase start connects phase hooks to TriggerCmd effect construction',()=>{
  assert.equal(connected.fixtures.length,4);
  const ordinary=connected.fixtures.find(row=>row.input.name==='ordinary').expected;
  assert.deepEqual(ordinary.trace.slice(0,3),['GetSkillCastTime',['OnEnterBeforePhase',55],['SendNotAwakerTimeline',false]]);
  assert.equal(ordinary.effectCount,2);
  assert.equal(ordinary.commandDeleted,false);
  const skipped=connected.fixtures.find(row=>row.input.name==='skip-phase').expected;
  assert.equal(skipped.trace.includes('GetSkillCastTime'),false);
  assert.deepEqual(skipped.trace.filter(row=>Array.isArray(row)&&row[0]==='GenerateEffectObj').map(row=>row[1].delay),[0,0]);
});
