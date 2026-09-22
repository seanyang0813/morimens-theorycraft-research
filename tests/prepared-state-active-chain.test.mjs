import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runPreparedStateActiveChain} from '../engine/prepared-state-active-chain.mjs';

const read=name=>{const bytes=readFileSync(new URL(`../research/extracted/config/${name}.json`,import.meta.url));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
const loaded=Object.fromEntries(['Skill','BattleApi','Cmd','State'].map(name=>[name,read(name)]));
const source={build:'pc-res144-build51',skills:loaded.Skill.data,battleApi:loaded.BattleApi.data,commands:loaded.Cmd.data,states:loaded.State.data,sourceHashes:Object.fromEntries(Object.entries(loaded).map(([name,row])=>[name,row.sha256]))};
const singular=()=>JSON.parse(readFileSync(new URL('../research/examples/theorycraft-prepared-state-active-sequence.json',import.meta.url),'utf8')).input;
const chain=actions=>{const one=singular();return {schemaVersion:1,kind:'morimens-prepared-state-active-chain',build:one.build,stateCard:one.stateCard,activeSkills:actions,roleBinding:one.roleBinding,targetRoleId:9};};

test('prepared state-to-Active chain carries HP and Block through repeated cards',()=>{
  const one=singular(),value=chain([one.activeSkill,one.activeSkill]),before=JSON.stringify(value),result=runPreparedStateActiveChain(value,source);
  assert.equal(result.executedActions,2);assert.equal(result.unexecutedActions,0);assert.equal(result.modeledHpLost,6);assert.deepEqual(result.targetAfter,{hp:994,block:0});
  assert.deepEqual(result.transitions.map(row=>[row.hpBefore,row.hpAfter]),[[1000,997],[997,994]]);
  assert.ok(result.activeSkills.every(row=>row.derivedSequenceInput.casterProperties.crit_damage===105));assert.equal(JSON.stringify(value),before);
});

test('prepared chain carries exposed caster energy into the next card',()=>{
  const one=singular(),active=one.activeSkill;
  active.schemaVersion=2;active.preparation={skillId:4046,skillLevel:6,isAwaker:true,breakSkillLevel:0,potencyLevel:0,overrides:[],variables:{BattleAtkForce:100},conditionResults:{},stateQueries:{}};
  active.snapshot.casterProperties={crit:0,crit_damage:0,crit_damage_from_strikecard:0,crit_damage_per:0,i_crit_per:0,i_crit_damage_per:50};active.snapshot.critRolls=[null];
  active.energy={source:{castRoleUid:8,cmdServerUid:2},target:{uid:8,role:'Awaker',energy:95,maximumProperties:{ulti_energy_max:100,ulti_energy_cost_per:0,ulti_energy_cost_flat:0,ulti_energy_max_per:0},calculation:{dimension:0,properties:{card_ulti_per:0,card_ulti_plus:0,o_ulti_energy_per:0,ulti_energy_per:0,i_ulti_energy_per:0,ulti_energy_efficiency:0,ulti_per_strikecard:0,ulti_energy_plus:0,gain_ulti_energy_per:0,gain_ulti_energy_plus:0}}}};
  const result=runPreparedStateActiveChain(chain([active,active]),source);
  assert.equal(result.modeledHpLost,40);assert.equal(result.casterEnergyAfter,100);assert.deepEqual(result.transitions.map(row=>row.energyAfter),[100,100]);
  assert.equal(result.activeSkills[1].energy.effect.applications[0].result.energyBefore,100);
});

test('a later card can declare and receive a state layer the first card did not query',()=>{
  const one=singular(),second=JSON.parse(JSON.stringify(one.activeSkill));second.preparation.stateQueries={'CmdCaster.GetStateLayer':{'3835':0}};
  const result=runPreparedStateActiveChain(chain([one.activeSkill,second]),source);
  assert.deepEqual(result.carry.availableCasterStateLayers,[{stateId:3835,layer:70}]);
  assert.deepEqual(result.transitions[0].stateLayerChanges,[]);assert.deepEqual(result.transitions[1].stateLayerChanges,[{stateId:3835,before:0,after:70}]);
});

test('prepared chain rejects target and shared-baseline drift',()=>{
  const one=singular(),copy=value=>JSON.parse(JSON.stringify(value)),target=chain([one.activeSkill,copy(one.activeSkill)]);target.activeSkills[1].snapshot.initialTargetProperties.hp=999;
  assert.throws(()=>runPreparedStateActiveChain(target,source),/same build, target binding/);
  const energy=chain([one.activeSkill,copy(one.activeSkill)]);energy.activeSkills[1].snapshot.casterProperties.crit_damage=1;
  assert.throws(()=>runPreparedStateActiveChain(energy,source),/property drift/);
});
