import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {auditReplayCandidateRows} from '../tools/audit_replay_candidate_rows.mjs';

test('frozen replay row audit matches the exported command catalog',()=>{
  const bytes=readFileSync(new URL('../research/extracted/config/Cmd.json',import.meta.url)),commands=JSON.parse(bytes),expected=JSON.parse(readFileSync(new URL('../research/evidence/replay-candidate-row-audit.json',import.meta.url)));
  const actual=auditReplayCandidateRows(commands,{sourceSha256:createHash('sha256').update(bytes).digest('hex')});assert.deepEqual(actual,expected);
  assert.ok(actual.commandShapeCompatible>0);assert.ok(actual.rowExpressionCompatible>=actual.commandShapeCompatible);assert.equal(actual.sourceSha256.length,64);
});
