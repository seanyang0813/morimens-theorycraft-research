import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runConditionalRoleStateSuffix} from '../engine/conditional-role-state-suffix.mjs';

const read=name=>JSON.parse(readFileSync(new URL(`../research/extracted/config/${name}.json`,import.meta.url)));
const commands=read('Cmd'),states=read('State');
const ids=[123168,124036,123165,123307,123523,123167];
const definition=id=>({id,maximum:String(states[String(id)].MaxLayer),properties:Object.entries(states[String(id)].ExistProperty??{}).map(([property,expression])=>({property,expression:String(expression)})),skillLevel:1,casterRoleId:50,specialValue:0,banned:false});
const roles=[{id:50,roleType:'Awakener',properties:{i_crit_per:0,i_crit_damage_per:0,i_damage_per_strikecard:0},tentacleContext:null},{id:1,roleType:'Player',properties:{i_crit_per:0,i_crit_damage_per:0},tentacleContext:null}];
const base={schemaVersion:1,kind:'morimens-conditional-role-state-suffix',build:'pc-res144-build51',otherEvents:'assumed-absent',command:{data_list:Object.fromEntries(Object.entries(commands['123163'].data_list).filter(([id])=>Number(id)>=2).map(([id,row])=>[String(Number(id)-1),row]))},variables:{},stateQueries:{'CmdCaster.GetStateLayer':{'122512':1},'PlayerRole.GetStateLayer':{'123723':0,'123167':0}},stateQueryTargets:{'CmdCaster.GetStateLayer':'CmdCaster','PlayerRole.GetStateLayer':'PlayerRole'},targetBindings:{CmdCaster:50,PlayerRole:1},roles,definitions:ids.map(definition)};

test('Mouchette suffix selects and executes the supported ordinary branch in source order',()=>{
  const before=JSON.stringify(base),result=runConditionalRoleStateSuffix(base);
  assert.deepEqual(result.conditionTrace.map(row=>[row.rowId,row.passed]),[['1',true],['2',false],['3',false],['4',false],['5',false],['6',true]]);
  assert.deepEqual(result.selectedRowIds,['1','6']);assert.deepEqual(result.execution.trace.map(row=>[row.rowId,row.type]),[['1','addState'],['6','removeState']]);
  assert.equal(result.roles.find(row=>row.id===50).properties.i_damage_per_strikecard,25);assert.equal(result.execution.trace[1].removed,false);assert.equal(JSON.stringify(base),before);
});

test('suffix rejects positive queried state that the command also mutates',()=>{
  const value={...base,stateQueries:{...base.stateQueries,'PlayerRole.GetStateLayer':{'123723':0,'123167':1}}};
  assert.throws(()=>runConditionalRoleStateSuffix(value),/initial-state registry/);
});
