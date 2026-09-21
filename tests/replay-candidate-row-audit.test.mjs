import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {auditReplayCandidateRows} from '../tools/audit_replay_candidate_rows.mjs';

test('frozen replay row audit matches the exported command catalog',()=>{
  const commandBytes=readFileSync(new URL('../research/extracted/config/Cmd.json',import.meta.url)),skillBytes=readFileSync(new URL('../research/extracted/config/Skill.json',import.meta.url)),commands=JSON.parse(commandBytes),skills=JSON.parse(skillBytes),expected=JSON.parse(readFileSync(new URL('../research/evidence/replay-candidate-row-audit.json',import.meta.url)));
  const actual=auditReplayCandidateRows(commands,skills,{sourceSha256:{Cmd:createHash('sha256').update(commandBytes).digest('hex'),Skill:createHash('sha256').update(skillBytes).digest('hex')}});assert.deepEqual(actual,expected);
  assert.equal(actual.commandShapeCompatible,actual.commandsWithOrdinaryActive);assert.equal(actual.rowExpressionCompatible,actual.ordinaryActiveRows);assert.deepEqual(actual.blockerCounts,{});assert.equal(actual.sourceSha256.Cmd.length,64);assert.equal(actual.sourceSha256.Skill.length,64);assert.ok(actual.relevantAwakenerSkills>actual.commandsWithOrdinaryActive);
  const mosk=actual.commands.find(row=>row.commandId===131035);assert.deepEqual(mosk.storedMainTargetSetup,{rowId:'2',target:'MaxHpEnemy',compatible:true});assert.equal(mosk.shapeCompatible,true);
});

test('stored main-target syntax fails closed without a prior supported setup',()=>{
  const commands={'20':{data_list:{1:{Type:'BEActiveDamage',Target:'TempMainTarget',Para:'Arg1'},2:{Type:'BESetTempMainTarget',Target:'RandomEnemy'}}}},skills={'10':{ID:10,AwakerID:1,Type:{1:'Card_Skill'},CmdList:20}};
  const result=auditReplayCandidateRows(commands,skills),row=result.commands[0];assert.equal(result.commandShapeCompatible,0);assert.equal(row.shapeCompatible,false);assert.deepEqual(row.ordinaryActiveRows[0].blockers,['STORED_MAIN_TARGET_SETUP']);
});
