import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyMonsterSkillChange,MONSTER_SKILL_CHANGE_TYPE as T} from '../engine/monster-skill-change.mjs';

const fixture=JSON.parse(readFileSync(new URL('./synthetic/original-monster-skill-change.json',import.meta.url)));
const current=JSON.parse(readFileSync(new URL('../research/evidence/pc-res150-monster-skill-change-runtime.json',import.meta.url)));

test('authored monster intent mutation matches original ChangeSkill fixtures',()=>{
  const rows=fixture.fixtures.filter(row=>row.domain==='ChangeSkill');
  assert.ok(rows.length>0);
  for(const row of rows){
    const modeled=applyMonsterSkillChange({...row.input.state,hasIntentionCommand:false},row.input.skillId,row.input.changeType);
    assert.deepEqual(modeled.state.tempSkillList,row.expected.tempSkillList,JSON.stringify(row.input));
    assert.equal(modeled.state.intention,row.input.skillId);
  }
});

test('insert queues an idle displayed intent while substitute clears the queue',()=>{
  const state={intention:902,intentionRun:false,tempSkillList:[{intention:800,changeType:T.Insert}],hasIntentionCommand:true};
  const inserted=applyMonsterSkillChange(state,60397,T.Insert);
  assert.deepEqual(inserted.state.tempSkillList,[{intention:800,changeType:1},{intention:902,changeType:1}]);
  assert.equal(inserted.state.lastIntention,902);assert.equal(inserted.state.intention,60397);
  assert.ok(!inserted.effects.some(effect=>effect.type==='executeIntention'));
  assert.deepEqual(applyMonsterSkillChange(state,60397,T.Substitute).state.tempSkillList,[]);
});

test('running intent is not queued and unsupported inputs fail closed',()=>{
  const state={intention:902,intentionRun:true,tempSkillList:[],hasIntentionCommand:false};
  assert.deepEqual(applyMonsterSkillChange(state,60397,T.Insert).state.tempSkillList,[]);
  assert.throws(()=>applyMonsterSkillChange(state,60397,2),/Unsupported/);
  assert.throws(()=>applyMonsterSkillChange({...state,unknown:1},60397,T.Insert),/Exact/);
});

test('installed resource 150 reproduces the original component fixtures',()=>{
  assert.equal(current.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');
  assert.equal(current.fixtures,fixture.fixtures.length);
  assert.equal(current.exactMatches,fixture.fixtures.length);
  assert.equal(current.mismatches.length,0);
});
