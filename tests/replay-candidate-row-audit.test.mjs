import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {auditReplayCandidateRows} from '../tools/audit_replay_candidate_rows.mjs';

test('frozen replay row audit matches the exported command catalog',()=>{
  const commandBytes=readFileSync(new URL('../research/extracted/config/Cmd.json',import.meta.url)),skillBytes=readFileSync(new URL('../research/extracted/config/Skill.json',import.meta.url)),commands=JSON.parse(commandBytes),skills=JSON.parse(skillBytes),expected=JSON.parse(readFileSync(new URL('../research/evidence/replay-candidate-row-audit.json',import.meta.url)));
  const actual=auditReplayCandidateRows(commands,skills,{sourceSha256:{Cmd:createHash('sha256').update(commandBytes).digest('hex'),Skill:createHash('sha256').update(skillBytes).digest('hex')}});assert.deepEqual(actual,expected);
  assert.ok(actual.commandShapeCompatible>0);assert.ok(actual.rowExpressionCompatible>=actual.commandShapeCompatible);assert.equal(actual.sourceSha256.Cmd.length,64);assert.equal(actual.sourceSha256.Skill.length,64);assert.ok(actual.relevantAwakenerSkills>actual.commandsWithOrdinaryActive);
});
