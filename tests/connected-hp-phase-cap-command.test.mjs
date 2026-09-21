import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const baseline=JSON.parse(readFileSync(new URL('./synthetic/original-connected-hp-phase-cap-command.json',import.meta.url)));
const current=JSON.parse(readFileSync(new URL('../research/evidence/pc-res150-connected-hp-phase-cap-command-runtime.json',import.meta.url)));

test('eligible HP listeners traverse every configured 60406 phase-cap row',()=>{
  assert.equal(baseline.fixtures.length,4);
  const expected=['BEAddState','BESubStateLayer','BESubStateLayer','BEAddState','BEMonsterChangeSkill','BEAddState','BERemoveState','BERemoveState'];
  for(const row of [baseline.fixtures[0],baseline.fixtures[3]]){
    assert.deepEqual(row.expected.commandEffects.map(effect=>effect.Type),expected);
    assert.ok(row.expected.commandEffects.every(effect=>effect.triggerValue===row.input.newValue-row.input.oldValue));
  }
  for(const row of [baseline.fixtures[1],baseline.fixtures[2]])assert.deepEqual(row.expected.commandEffects,[]);
});

test('resource 150 matches the bounded HP-to-60406 runtime path',()=>{
  assert.equal(current.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');
  assert.equal(current.fixtures,4);assert.equal(current.exactMatches,4);assert.equal(current.mismatches,0);
  assert.match(current.limitations.join(' '),/No command conditions or effect bodies execute/);
});
