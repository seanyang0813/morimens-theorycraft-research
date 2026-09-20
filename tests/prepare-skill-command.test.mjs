import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareSkillCommand} from '../engine/prepare-skill-command.mjs';
const read=name=>JSON.parse(readFileSync(new URL('../research/extracted/config/'+name+'.json',import.meta.url)));
const skills=read('Skill'),api=read('BattleApi'),formulaExpressions=Object.fromEntries(Object.entries(api).filter(([name,row])=>name.startsWith('BattleFomula')).map(([name,row])=>[name,row.Data]));
test('actual exported progression skill selects command and builds numeric arguments',()=>{
  const r=prepareSkillCommand({skill:skills[4163],skillLevel:6,isAwaker:true,breakSkillLevel:0,potencyLevel:3,formulaExpressions,overrides:[],readVariable:name=>name==='BattleAtkForce'?258:undefined});
  assert.equal(r.commandId,57564);assert.deepEqual(r.arguments,[52,10]);assert.equal(r.argumentBindings.Arg1,52);
  assert.equal(r.status,'PREPARED_COMMAND_UNVERIFIED');
});
test('actual state-dependent parameter reads stay explicit and support supplied state queries',()=>{
  const input={skill:skills[4638],skillLevel:6,isAwaker:true,breakSkillLevel:0,potencyLevel:0,formulaExpressions,overrides:[],readVariable:name=>name==='BattleAtkForce'?258:undefined};
  assert.throws(()=>prepareSkillCommand(input));
  const r=prepareSkillCommand({...input,allowedFunctions:['CmdCaster.GetStateLayer'],callFunction:(name,args)=>{assert.ok([45713,119813].includes(args[0]));return 0;}});
  assert.equal(r.commandId,1849);assert.deepEqual(r.arguments,[207,3]);
});
