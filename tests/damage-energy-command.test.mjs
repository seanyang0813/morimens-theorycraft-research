import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runDamageEnergyCommand} from '../engine/damage-energy-command.mjs';
import {neutralShowInputs} from '../engine/show-damage.mjs';
import {targetKeys} from '../engine/active-target.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
function input(){
 const {value,...offense}=neutralShowInputs(0),e=read('../research/examples/ulti-energy-experiment.json');
 return {schemaVersion:1,kind:'morimens-damage-energy-command',build:'pc-res144-build51',otherEvents:'assumed-absent',command:read('../research/extracted/config/Cmd.json')['2112'],variables:{Arg1:120,Arg2:10},attackBase:{offense,targetModifiers:{...Object.fromEntries(targetKeys.map(k=>[k,0])),isCrit:false,enemyStateDmgMultiplier:1},targetState:{hp:1000,block:0},repeatModifiers:{plus:0,per:0},immune:false},energy:{source:{...e.source,castRoleUid:7},target:e.targets[0]}};
}
test('complete exported damage-plus-energy command carries both recipient states',()=>{
 const v=input(),before=JSON.stringify(v),r=runDamageEnergyCommand(v);
 assert.equal(r.completed,true);assert.equal(r.targetAfter.hp,880);assert.equal(r.casterEnergyAfter,100);
 assert.deepEqual(r.actions.map(a=>a.type),['damage','energy']);assert.equal(r.actions[1].result.effect.applications[0].result.storage.energyGained,5);
 assert.equal(JSON.stringify(v),before);
});
test('later conditions see live energy and lethal damage stops before granting energy',()=>{
 const v=input();v.command.data_list['3']={Type:'BEActiveDamage',Target:'UpperTarget',Para:'CmdCaster.ulti_energy',Cond:'CmdCaster.ulti_energy==100'};
 assert.equal(runDamageEnergyCommand(v).targetAfter.hp,780);
 v.variables.Arg1=2000;const r=runDamageEnergyCommand(v);assert.equal(r.completed,false);assert.equal(r.casterEnergyAfter,95);assert.equal(r.actions.length,1);
});
test('unsupported state effects block the entire command before calculation',()=>{
 const v=input();v.command.data_list['3']={Type:'BEAddState',Target:'CmdCaster',Para:'2669,10'};
 const r=runDamageEnergyCommand(v);assert.equal(r.status,'UNSUPPORTED_COMMAND');assert.equal(r.calculation,null);
});
