import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runPreparedMortalBlast} from '../engine/prepared-mortal-blast.mjs';

function source(){const root='../research/observations/current-res150-build51/modules',loaded={};for(const name of ['Skill','BattleApi','Cmd','State']){const bytes=readFileSync(new URL(`${root}/${name}.json`,import.meta.url));loaded[name]={data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')}}return {build:'pc-res150-build51',skills:loaded.Skill.data,battleApi:loaded.BattleApi.data,commands:loaded.Cmd.data,states:loaded.State.data,sourceHashes:{Skill:loaded.Skill.sha256,BattleApi:loaded.BattleApi.sha256,Cmd:loaded.Cmd.sha256,State:loaded.State.sha256}}}
const card=(uid,id,stateIds=[])=>({uid,id,level:90,camp:1,specialOwner:56,performSkillId:id,cardTypes:['Card_Strike'],stateIds,createCardArgs:[]});
function input(){
  const build='pc-res150-build51';
  const direct={schemaVersion:4,kind:'morimens-prepared-snapshot-active-skill',build,preparation:{skillId:122483,skillLevel:1,isAwaker:true,breakSkillLevel:0,potencyLevel:15,overrides:[],variables:{BattleAtkForce:100},conditionResults:{},stateQueries:{'CmdCaster.GetStateLayer':{'124039':0}}},targetBinding:{expression:'AllEnemy',resolution:'supplied-single-target-selector',eligibleTargetCount:1},lifecycle:'assumed-absent',snapshot:{snapshotStage:'battle-property-server-live',snapshotCompleteness:'complete-map',casterProperties:{crit:0,crit_damage:0,crit_damage_from_strikecard:0,crit_damage_per:0},playerProperties:{dimension_fix_per:0},initialTargetProperties:{hp:1000,max_hp:1000,block:0,be_damage_per:0,vulnerable_per:0},cardProperties:{},targetBattleTag:'Monster',targetStateIds:[],critRolls:[null,null]},repeatModifiers:{plus:0,per:0}};
  const historySelection={schemaVersion:1,kind:'morimens-copy-history-card-selection',build,cardTypes:['Card_Strike'],endNum:0,beginNum:99,needNum:1,skipSameId:0,exceptCardTypes:[],exceptStateIds:[123811,124733],history:[[card(1,126484)],[card(2,122483,[123811])]]};
  const copySuffix={schemaVersion:1,kind:'morimens-mortal-blast-copy-suffix',build,potencyGreaterThanOne:true,historySelection,castRoleUid:94450,camp:1,cardManagerState:{decks:{NoneDeck:[],DrawDeck:[],HandDeck:[],DimensionDeck:[]},enternalCardUids:[]},allocatedCardUid:99,maxHand:5};
  return {schemaVersion:1,kind:'morimens-prepared-mortal-blast',build,direct,copySuffix};
}

test('prepared Mortal Blast joins all five bounded rows without playing the copied Strike',()=>{
  const value=input(),before=JSON.stringify(value),result=runPreparedMortalBlast(value,source());
  assert.deepEqual(result.preparedArguments,[15,2]);assert.equal(result.modeledDirectHpLost,30);
  assert.deepEqual(result.boundedRowsModeled,['1','2','3','4','5']);assert.deepEqual(result.generatedPlayableCardUids,[99]);
  assert.deepEqual(result.copySuffix.cardsAfter[0].propertyDeltas,{card_cost:-1,consume:1,nothingness:1});
  assert.equal(result.completeSkill,false);assert.equal(result.finalDamage,null);assert.equal(JSON.stringify(value),before);
});

test('prepared Mortal Blast fails closed on skill, target-count and potency drift',()=>{
  const skill=input();skill.direct.preparation.skillId=3997;assert.throws(()=>runPreparedMortalBlast(skill,source()),/Skill 122483/);
  const targets=input();targets.direct.targetBinding.eligibleTargetCount=2;assert.throws(()=>runPreparedMortalBlast(targets,source()),/exactly one eligible target/);
  const potency=input();potency.copySuffix.potencyGreaterThanOne=false;assert.throws(()=>runPreparedMortalBlast(potency,source()),/Arg2 > 1/);
});
