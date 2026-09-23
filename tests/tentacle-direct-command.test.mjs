import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateDirectTentacleCommand} from '../engine/tentacle-direct-command.mjs';
import {runTheorycraftRequest} from '../engine/theorycraft-api.mjs';

const sample=JSON.parse(readFileSync(new URL('../research/examples/theorycraft-installed-direct-tentacle-command.json',import.meta.url)));

test('source-bound direct Tentacle row composes upstream player, command ceiling, critical branch and target stages',()=>{
  const response=runTheorycraftRequest(sample);
  const result=response.result;
  assert.equal(result.player.value,230);
  assert.equal(result.command.effectDamage,106);
  assert.equal(result.critical.value,84);
  assert.equal(result.preHitDamage,235);
  assert.equal(result.finalDamage,null);
  assert.equal(result.commandExpression,'PlayerRole.tentacle_dmg*CmdCaster.occupation_master/200,1,0');
  assert.equal(calculateDirectTentacleCommand({...sample.input,isCrit:false}).preHitDamage,128);
  assert.throws(()=>calculateDirectTentacleCommand({...sample.input,target:{...sample.input.target,unknown:0}}),/Exact finite target/);
  assert.throws(()=>calculateDirectTentacleCommand({...sample.input,target:{...sample.input.target,paraPlus:1}}),/zero third parameter/);
  assert.throws(()=>calculateDirectTentacleCommand({...sample.input,awakers:[]}),/At least one/);
});
