import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const suite=JSON.parse(readFileSync(new URL('./synthetic/original-card-effect-chain.json',import.meta.url)));

test('ordinary card chain preserves exits and effect construction order',()=>{
  assert.equal(suite.fixtures.length,8);
  const byName=Object.fromEntries(suite.fixtures.map(row=>[row.input.name,row.expected]));
  assert.equal(byName['missing-card'].returned,false);
  for(const name of ['card-hard-block','owner-hard-block','state-hard-block'])assert.deepEqual(byName[name].memberWrites,[{name:'ForceConsumeMode',valueIsNil:true}]);
  assert.deepEqual(byName['generated-target-chain'].effects.map(row=>row.effectType),['BEGenerateTargets','BEBeforeUseCard','BECreateSkillPhase','BEAfterUseCard']);
  assert.deepEqual(byName['explicit-target-pre-chain'].upperTargets,[[701,702]]);
  assert.deepEqual(byName['explicit-target-pre-chain'].effects.map(row=>row.cmdServer),['main','pre','main',null]);
  assert.deepEqual(byName['use-card-wrapper'].trace,['runOrder','caster:9','currentCard:9','runOrderDone']);
});
