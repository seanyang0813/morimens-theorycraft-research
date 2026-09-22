import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runPreparedSnapshotBlockSkill} from '../engine/prepared-snapshot-block-skill.mjs';

const roots={'pc-res144-build51':'../research/extracted/config','pc-res150-build51':'../research/observations/current-res150-build51/modules','pc-res151-build51':'../research/observations/current-res151-build51/modules'};
function source(build){
  const loaded={};for(const name of ['Skill','BattleApi','Cmd','State']){const bytes=readFileSync(new URL(`${roots[build]}/${name}.json`,import.meta.url));loaded[name]={data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};}
  return {build,skills:loaded.Skill.data,battleApi:loaded.BattleApi.data,commands:loaded.Cmd.data,states:loaded.State.data,sourceHashes:Object.fromEntries(Object.entries(loaded).map(([name,row])=>[name,row.sha256]))};
}
function input(build='pc-res150-build51'){
  return {schemaVersion:1,kind:'morimens-prepared-snapshot-block-skill',build,
    preparation:{skillId:4176,skillLevel:1,isAwaker:true,breakSkillLevel:0,potencyLevel:0,overrides:[],variables:{BattleDefForce:100},conditionResults:{},stateQueries:{}},
    targetBinding:{expression:'PlayerRole',resolution:'supplied-single-UpperTarget',targetUid:8},lifecycle:'assumed-absent',
    snapshot:{snapshotStage:'battle-property-server-live',snapshotCompleteness:'complete-map',casterProperties:{ulti_energy:95,ulti_energy_max:100,ulti_energy_cost_per:0,ulti_energy_cost_flat:0,ulti_energy_max_per:0,o_ulti_energy_per:0,ulti_energy_per:0,i_ulti_energy_per:0,ulti_energy_efficiency:0,ulti_energy_plus:0,gain_ulti_energy_per:0,gain_ulti_energy_plus:0,ulti_per_defendcard:0},playerProperties:{dimension_fix_per:0},cardProperties:{},targetProperties:{block:0,max_hp:1000}},
    energy:{source:{castRoleUid:7,cmdServerUid:2}}};
}

for(const build of Object.keys(roots))test(`prepared Defend Block and energy execute from complete snapshots on ${build}`,()=>{
  const value=input(build),before=JSON.stringify(value),result=runPreparedSnapshotBlockSkill(value,source(build));
  assert.equal(result.prepared.commandId,834);assert.deepEqual(result.prepared.arguments,[10,5]);assert.deepEqual(result.catalogTypes,['Card_Defend']);
  assert.deepEqual(result.command.rows.map(row=>row.Type),['BEGainBlock','BEGainUltiEnergy']);assert.equal(result.block.blockAfter,10);assert.equal(result.block.actualBlockGained,10);
  assert.equal(result.energy.targetsAfter[0].energy,100);assert.equal(result.completed,true);assert.equal(result.finalDamage,null);assert.equal(JSON.stringify(value),before);
  assert.equal(result.blockPropertyDerivation.source,'ordinary Camp1 PvE Awakener/card GetRealBlock property ownership');
  assert.equal(result.energyPropertyDerivation.source,'complete property snapshots with GetProperty zero-default');
});

test('prepared Defend derives tag, flat, recipient and cap properties with exposed reads',()=>{
  const value=input();Object.assign(value.snapshot.casterProperties,{block_per_defendcard:100,i_block_per_defendcard:0,block_plus:0});Object.assign(value.snapshot.playerProperties,{block_plus:5,frail_per:0});Object.assign(value.snapshot.targetProperties,{gain_block_per:20,gain_block_plus:1,block_max_per:0});
  const result=runPreparedSnapshotBlockSkill(value,source(value.build));
  assert.equal(result.block.formula.showBlock,25);assert.equal(result.block.requestedBlock,31);assert.equal(result.block.blockAfter,31);
  assert.deepEqual(result.blockPropertyDerivation.tagFactors,[{tag:'Card_Defend',bucket:'outside',property:'block_per_defendcard',percent:100},{tag:'Card_Defend',bucket:'inside',property:'i_block_per_defendcard',percent:0}]);
  assert.equal(result.blockPropertyDerivation.reads.find(row=>row.owner==='target'&&row.property==='gain_block_per').value,20);
});

test('prepared Defend fails closed on target, command and schema drift',()=>{
  const wrong=input();wrong.targetBinding.expression='FrontEnemy';assert.throws(()=>runPreparedSnapshotBlockSkill(wrong,source(wrong.build)),/does not match/);
  const data=source('pc-res150-build51'),changed=input();data.commands['834'].data_list['1']={...data.commands['834'].data_list['1'],Target:'PlayerRole'};assert.throws(()=>runPreparedSnapshotBlockSkill(changed,data),/Block then caster energy/);
  const extra=input();extra.snapshot.targetProperties.invented='x';assert.throws(()=>runPreparedSnapshotBlockSkill(extra,source(extra.build)),/Complete finite targetProperties/);
  const oldEnergy=input();oldEnergy.energy.target={};assert.throws(()=>runPreparedSnapshotBlockSkill(oldEnergy,source(oldEnergy.build)),/Exact preparation/);
});
