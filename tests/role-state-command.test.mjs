import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runRoleStateCommand} from '../engine/role-state-command.mjs';

const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const states=read('../research/extracted/config/State.json'),commands=read('../research/extracted/config/Cmd.json');
const definition=id=>{const row=states[String(id)];return {id,maximum:String(row.MaxLayer),properties:Object.entries(row.ExistProperty??{}).map(([property,expression])=>({property,expression:String(expression)})),skillLevel:1,casterRoleId:50,specialValue:0,banned:false};};
function input(){return {schemaVersion:1,kind:'morimens-role-state-command',build:'pc-res144-build51',otherEvents:'assumed-absent',command:commands['60401'],variables:{Arg1:80},targetBindings:{CmdCaster:50},roles:[{id:50,roleType:'Monster',properties:{i_crit_per:0,i_crit_damage_per:0,be_damage_per:0,be_fixed_damage_per1:0,be_passive_damage_per:0,damage_plus:0,tentacle_dmg:0},tentacleContext:{pve:true,ownerMonster:true,maxTentacleCount:0}}],definitions:[definition(60089),definition(2900),definition(60404)]};}

test('setup-only Final Evolution rows apply states and preserve presentation separately',()=>{
  const v=input(),before=JSON.stringify(v),result=runRoleStateCommand(v),role=result.roles[0];
  assert.equal(result.completed,true);assert.equal(result.finalDamage,null);assert.equal(JSON.stringify(v),before);
  assert.deepEqual(result.trace.map(row=>row.type),['addState','addState','presentation','addState']);
  assert.deepEqual({active:role.properties.be_damage_per,fixed:role.properties.be_fixed_damage_per1,passive:role.properties.be_passive_damage_per,strength:role.properties.damage_plus,tentacle:role.properties.tentacle_dmg},{active:-20,fixed:-20,passive:-20,strength:80,tentacle:0});
  assert.equal(result.trace[1].mutations.find(row=>row.property==='tentacle_dmg').blocked,'PVE monster has no tentacle capacity');
  assert.deepEqual(result.trace[2].record,{kind:'MonsterBubble',roleId:50,tipsId:'Monster_Chapter8_08',showTime:8000});
  assert.deepEqual(result.states.map(row=>[row.stateId,row.layer]),[[60089,20],[2900,80],[60404,1]]);
});

test('state merges update the same role and unsupported command rows fail closed',()=>{
  const v=input();v.command={data_list:{1:{Type:'BEAddState',Target:'CmdCaster',Para:'60089,20'},2:{Type:'BEAddState',Target:'CmdCaster',Para:'60089,20'}}};v.definitions=[definition(60089)];
  const result=runRoleStateCommand(v);assert.equal(result.roles[0].properties.be_damage_per,-40);assert.equal(result.states[0].layer,40);assert.equal(result.trace[1].created,false);
  v.command.data_list['2']={Type:'BEActiveDamage',Target:'CmdCaster',Para:'100'};assert.throws(()=>runRoleStateCommand(v),/Unsupported setup row/);
});

test('layer subtraction and removal reverse live role properties in row order',()=>{
  const v=input();v.command={data_list:{1:{Type:'BEAddState',Target:'CmdCaster',Para:'60089,20'},2:{Type:'BESubStateLayer',Target:'CmdCaster',Para:'60089,5'},3:{Type:'BERemoveState',Target:'CmdCaster',Para:'60089'}}};v.definitions=[definition(60089)];
  const result=runRoleStateCommand(v),role=result.roles[0],state=result.states[0];
  assert.deepEqual(result.trace.map(row=>row.type),['addState','subtractState','removeState']);assert.equal(result.trace[1].subtraction.changedLayer,-5);assert.equal(result.trace[2].removed,true);
  assert.equal(role.properties.be_damage_per,0);assert.equal(role.properties.be_fixed_damage_per1,0);assert.equal(role.properties.be_passive_damage_per,0);assert.equal(state.isDeleted,true);assert.equal(state.layer,15);
  assert.deepEqual(result.trace[2].lifecycleTrace,['removeProperty','recordDeletion','log','StateLifeEnd']);
});

test('subtracting the final layer updates ChangedLayer properties before idempotent life end',()=>{
  const v=input();v.command={data_list:{1:{Type:'BEAddState',Target:'CmdCaster',Para:'60089,2'},2:{Type:'BESubStateLayer',Target:'CmdCaster',Para:'60089,2'},3:{Type:'BERemoveState',Target:'CmdCaster',Para:'60089'}}};v.definitions=[definition(60089)];
  const result=runRoleStateCommand(v);assert.equal(result.roles[0].properties.be_damage_per,0);assert.equal(result.states[0].layer,0);assert.equal(result.states[0].isDeleted,true);assert.equal(result.trace[2].removed,false);
});

test('role snapshots and tentacle context remain explicit',()=>{
  const v=input();delete v.roles[0].properties.damage_plus;assert.throws(()=>runRoleStateCommand(v),/lacks explicit property/);
  const nonMonster=input();nonMonster.roles[0].roleType='Awakener';nonMonster.roles[0].tentacleContext={pve:true,ownerMonster:false,maxTentacleCount:0};const result=runRoleStateCommand(nonMonster);assert.equal(result.trace[2].returned,false);assert.equal(result.trace[2].record,null);
});

test('resource-151 role-state execution requires the exact internal prepared-setup profile',()=>{
  const v=input();v.build='pc-res151-build51';
  assert.throws(()=>runRoleStateCommand(v),/Explicit setup-only/);
  const result=runRoleStateCommand(v,{resource151Profile:'prepared-role-state-setup'});
  assert.equal(result.build,'pc-res151-build51');assert.equal(result.roles[0].properties.damage_plus,80);
  assert.throws(()=>runRoleStateCommand(v,{resource151Profile:'other'}),/Unsupported role-state execution option/);
});
