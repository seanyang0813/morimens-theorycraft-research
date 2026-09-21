import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runCommandDamagePrefix} from '../engine/command-damage-prefix.mjs';
import {neutralShowInputs} from '../engine/show-damage.mjs';
import {targetKeys} from '../engine/active-target.mjs';

const commands=JSON.parse(readFileSync(new URL('../research/extracted/config/Cmd.json',import.meta.url)));
const {value,...offense}=neutralShowInputs(0);
const input={schemaVersion:1,kind:'morimens-command-damage-prefix',build:'pc-res144-build51',command:commands['123163'],targetBinding:{expression:'RandomEnemy',resolution:'supplied-single-target'},variables:{Arg1:300,Arg2:6},offense,targetModifiers:{...Object.fromEntries(targetKeys.map(key=>[key,0])),isCrit:false,enemyStateDmgMultiplier:1},targetState:{hp:100000,block:0},repeatModifiers:{plus:0,per:0},immune:false,presentationPolicy:'record-only'};

test('Mouchette follow-up executes its leading damage row and stops before state mutation',()=>{
  const before=JSON.stringify(input),result=runCommandDamagePrefix(input);
  assert.equal(result.totalRows,7);assert.equal(result.executedPrefixRows,1);assert.equal(result.stop.beforeRowId,'2');assert.equal(result.stop.type,'BEAddState');
  assert.equal(result.execution.hits.length,6);assert.equal(result.modeledHpLost,1800);assert.deepEqual(result.targetAfter,{hp:98200,block:0});
  assert.equal(result.presentation[0].baseSortId,5757);assert.deepEqual(result.presentation[0].vfx,{'1':124229});assert.equal(JSON.stringify(input),before);
});

test('damage-prefix executor never skips an unsupported leading row',()=>{
  const command={data_list:{'1':{Type:'BEAddState',Target:'CmdCaster',Para:'1,1'},'2':{Type:'BEActiveDamage',Target:'RandomEnemy',Para:'Arg1,Arg2'}}};
  const result=runCommandDamagePrefix({...input,command});
  assert.equal(result.execution,null);assert.equal(result.executedPrefixRows,0);assert.equal(result.modeledHpLost,0);assert.equal(result.stop.beforeRowId,'1');
});
