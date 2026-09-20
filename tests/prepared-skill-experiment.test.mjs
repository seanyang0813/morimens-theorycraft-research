import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runPreparedSkillExperiment} from '../engine/prepared-skill-experiment.mjs';
import {neutralShowInputs} from '../engine/show-damage.mjs';
import {targetKeys} from '../engine/active-target.mjs';
const read=name=>JSON.parse(readFileSync(new URL(`../research/extracted/config/${name}.json`,import.meta.url)));
const skills=read('Skill'),commands=read('Cmd'),api=read('BattleApi'),states=read('State');
function input(skillId=4100){
 const {value,...offense}=neutralShowInputs(0);
 return {preparation:{skill:skills[skillId],skillLevel:1,isAwaker:false,breakSkillLevel:0,potencyLevel:0,formulaExpressions:Object.fromEntries(Object.entries(api).filter(([k])=>k.startsWith('BattleFomula')).map(([k,v])=>[k,v.Data])),overrides:[],readVariable:name=>name==='BattleAtkForce'?100:undefined},commands,
 targetBinding:{expression:skills[skillId].CmdTarget,resolution:'supplied-single-UpperTarget'},lifecycle:'assumed-absent',
 experiment:{schemaVersion:1,kind:'morimens-active-command-experiment',build:'pc-res144-build51',interveningEffects:'assumed-absent',variables:{},offense,targetModifiers:{...Object.fromEntries(targetKeys.map(k=>[k,0])),isCrit:false,enemyStateDmgMultiplier:1},targetState:{hp:1000,block:0},repeatModifiers:{plus:0,per:0},immune:false}};
}
test('actual exported skill prepares arguments, imports full command and executes with full traces',()=>{
 const r=runPreparedSkillExperiment(input());
 assert.equal(r.prepared.commandId,743);assert.deepEqual(r.prepared.arguments,[120,1]);
 assert.equal(r.status,'EXPERIMENTAL');assert.equal(r.finalDamage,null);
 assert.equal(r.calculation.modeledHpLost,120);assert.equal(r.calculation.targetAfter.hp,880);
 assert.equal(r.calculation.command.trace.length,r.support.rowCount);
 assert.ok(r.calculation.hits[0].calculation.trace.length>0);
});
test('mixed-effect skill cannot silently execute its damage-only subset',()=>{
 const v=input(4163);v.preparation.isAwaker=true;v.preparation.potencyLevel=3;
 const r=runPreparedSkillExperiment(v);
 assert.equal(r.status,'UNSUPPORTED_COMMAND');assert.equal(r.calculation,null);
 assert.equal(r.support.rowCount,3);assert.ok(r.support.rows.some(r=>r.type==='BEAddState'));
});
test('target ambiguity and conflicting caller arguments fail before damage',()=>{
 const v=input();v.targetBinding.expression='Enemy';assert.throws(()=>runPreparedSkillExperiment(v),/binding/);
 v.targetBinding.expression=skills[4100].CmdTarget;v.experiment.variables.Arg1=999;
 assert.throws(()=>runPreparedSkillExperiment(v),/ArgN/);
});

test('front-enemy context selects the recipient and rejects mismatched HP snapshots',()=>{
 const v=input();
 const roles=[{uid:7,camp:2,hasHpBar:true,dead:false,position:2,sneak:0},{uid:8,camp:2,hasHpBar:true,dead:false,position:-1,sneak:0}];
 v.targetBinding={expression:'FrontEnemy',resolution:'front-enemy-context',targetUid:8,context:{casterCamp:1,lockedUid:null,tauntUid:null,roles}};
 const r=runPreparedSkillExperiment(v);assert.deepEqual(r.targetResolution.targets,[8]);assert.equal(r.calculation.modeledHpLost,120);
 v.targetBinding.targetUid=7;assert.throws(()=>runPreparedSkillExperiment(v),/snapshot/);
 v.targetBinding.context.lockedUid=7;assert.equal(runPreparedSkillExperiment(v).targetResolution.reason,'locked');
});

test('actual selected Strike command prepares damage and energy together without caller ArgN values',()=>{
 const v=input(4046);v.preparation.skillLevel=6;v.preparation.isAwaker=true;
 const e=JSON.parse(readFileSync(new URL('../research/examples/ulti-energy-experiment.json',import.meta.url)));
 e.targets[0].calculation.skillTags=['Card_Strike'];e.targets[0].calculation.card={matchesEnergyCardTypes:true};Object.assign(e.targets[0].calculation.properties,{ulti_per_strikecard:0,card_ulti_per:0,card_ulti_plus:0,o_ulti_energy_per:0});
 const {schemaVersion,build,offense,targetModifiers,targetState,repeatModifiers,immune}=v.experiment;
 v.experiment={schemaVersion,build,kind:'morimens-damage-energy-command',otherEvents:'assumed-absent',variables:{},attackBase:{offense,targetModifiers,targetState,repeatModifiers,immune},energy:{source:{...e.source,castRoleUid:7,skillConfigId:4046},target:e.targets[0]}};
 const r=runPreparedSkillExperiment(v);
 assert.equal(r.prepared.commandId,2112);assert.deepEqual(r.prepared.arguments,[20,10]);
 assert.equal(r.calculation.targetAfter.hp,980);assert.equal(r.calculation.casterEnergyAfter,100);
 assert.deepEqual(r.calculation.actions.map(a=>a.type),['damage','energy']);
 v.experiment.energy.source.skillConfigId=3;assert.throws(()=>runPreparedSkillExperiment(v),/identity/);
});

test('potency-selected three-effect Strike prepares arguments and applies its terminal state',()=>{
 const v=input(4163);v.preparation.skillLevel=6;v.preparation.isAwaker=true;v.preparation.potencyLevel=3;
 const e=JSON.parse(readFileSync(new URL('../research/examples/ulti-energy-experiment.json',import.meta.url)));
 e.targets[0].calculation.skillTags=['Card_Strike'];e.targets[0].calculation.card={matchesEnergyCardTypes:true};Object.assign(e.targets[0].calculation.properties,{ulti_per_strikecard:0,card_ulti_per:0,card_ulti_plus:0,o_ulti_energy_per:0});
 const {schemaVersion,build,offense,targetModifiers,targetState,repeatModifiers,immune}=v.experiment,state=states['2669'];
 v.experiment={schemaVersion,build,kind:'morimens-terminal-state-command',otherEvents:'assumed-absent',variables:{},attackBase:{offense,targetModifiers,targetState,repeatModifiers,immune},energy:{source:{...e.source,castRoleUid:7,skillConfigId:4163},target:e.targets[0]},
  state:{definition:{id:2669,owner:'actor',maximum:String(state.MaxLayer),properties:Object.entries(state.ExistProperty).map(([property,expression])=>({property,expression})),skillLevel:6,caster:7,specialValue:0,banned:false},
   request:{layer:10,immune:false,context:{trigger:false,skipCaster:false,noDirect:false,ulti:false,casterPresent:true,awaker:true,currentCardPresent:true,currentCardInstruction:true,currentCardSkill:false,modifierCardPresent:true,modifierCardInstruction:true},modifiers:Object.fromEntries(['StateLayerPer','UltiStateLayerPer','CmdCardStateLayerPer','StateLayerPerByCard','BeStateLayerPer','BeDirectCmdStateLayerPer','UltiFixedStateLayerPer','CmdCardFixedStateLayerPer','CardFixedStateLayerPer','DirectCmdStateLayerPer'].map(k=>[k,[]])),dimensionStateIds:[],perLimit:null,totalLimit:null},
   actorProperties:{basic_damage_per:offense.basicDamagePer,crit_damage:targetModifiers.awakerCritDamage,i_crit_damage_per:50},targetProperties:{be_damage_per:targetModifiers.beDamagePer,be_damage_per2:targetModifiers.beDamagePer2,be_damage_per3:targetModifiers.beDamagePer3,vulnerable_per:targetModifiers.vulnerablePer},stateQueries:{}}};
 const r=runPreparedSkillExperiment(v);
 assert.equal(r.prepared.commandId,57564);assert.deepEqual(r.prepared.arguments,[20,10]);assert.equal(r.support.structurallyCompatible,true);
 assert.equal(r.calculation.targetAfter.hp,980);assert.equal(r.calculation.casterEnergyAfter,100);assert.equal(r.calculation.stateApplication.properties.actor.crit_damage,15);
});
