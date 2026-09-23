import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildBlindReplayPrediction} from '../engine/replay-blind-prediction.mjs';
import {freezeBlindReplayPrediction} from '../tools/freeze_blind_replay_prediction.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));

const role=(uid,tid,camp,roleType,properties)=>({uid,tid,camp,roleType,properties});
function fixture(castDamage){
  const caster=role(1,101,1,1,{hp:500,crit:37});
  const target=role(2,201,2,2,{hp:1000,block:0,be_fixed_damage_per1:10});
  const player=role(3,0,1,3,{hp:500,dimension_fix_per:0});
  const cards={'30':{uid:30,tid:10,ownerUid:1,camp:1,cardArgs:{1:100,2:1,3:0,4:1},properties:{}}};
  const hit={recordIndex:4,frameIndex:2,data:{roleUid:2,beHitConfig:{castRoleUid:1,skillConfigId:10,damageType:6,castDamage,isCrit:true,oldHp:1000,blockLose:0}}};
  const action={actionIndex:0,boundaryStatus:'COMPLETE',cardUid:30,camp:1,roles:{'1':caster,'2':target,'3':player},cards,activeStates:[],window:{selectedTargetCommands:[],hits:[hit],hitSnapshots:[{hitIndex:0,recordIndex:4,frameIndex:2,boundaryStatus:'COMPLETE',roles:{'1':caster,'2':{...target,properties:{...target.properties,hp:900}},'3':player},cards,activeStates:[],reconstruction:{targetHp:'outcome'}}]}};
  return {index:{kind:'MORIMENS_REPLAY_EVENT_INDEX',build:'pc-res144-build51',actionSnapshots:[action]},skills:{'10':{ID:10,CmdList:20,Type:['Card_Skill']}},commands:{'20':{data_list:[{Type:'BEFixedDamage',Target:'UpperTarget',Cond:'PlayerRole.GetStateLayer(99)==0',Para:'Arg1,Arg4'},{Type:'BEFixedDamage',Target:'AllEnemy',Cond:'PlayerRole.GetStateLayer(99)>0',Para:'Arg1,Arg4'}]}},monsters:{'201':{ID:201,BattleTag:'Boss'}},awakeners:{'101':{ID:101,School:2}}};
}

test('Fixed first-hit prediction excludes recorded damage and critical fields',()=>{
  const a=buildBlindReplayPrediction(fixture(110));
  const b=buildBlindReplayPrediction(fixture(999999));
  // The copied Lua's floating-point multiplication crosses the ceiling at 110.
  assert.equal(a.predictedDamage,111);
  assert.equal(a.routing.damageType,6);
  assert.equal(a.scenario.effect.baseDamage,100);
  assert.equal(a.sealedProjectionSha256,b.sealedProjectionSha256);
  assert.equal(JSON.stringify(a).includes('999999'),false);
});

test('Fixed selector rejects changed modifiers and conflicting eligible rows',()=>{
  const changed=fixture(110);
  changed.index.actionSnapshots[0].window.hitSnapshots[0].roles['2'].properties.be_fixed_damage_per1=20;
  assert.throws(()=>buildBlindReplayPrediction(changed),/Fixed target modifier changed/);
  const ambiguous=fixture(110);
  ambiguous.commands['20'].data_list[1].Cond='PlayerRole.GetStateLayer(99)==0';
  ambiguous.commands['20'].data_list[1].Para='Arg1+1,Arg4';
  assert.throws(()=>buildBlindReplayPrediction(ambiguous),/Eligible Fixed rows predict different damage/);
});

test('Fixed selector rejects a prior hit because it could alter first-hit inputs',()=>{
  const input=fixture(110);
  input.index.actionSnapshots[0].window.hits.unshift({recordIndex:3,frameIndex:1,data:{roleUid:2,beHitConfig:{castRoleUid:1,skillConfigId:99,damageType:1}}});
  assert.throws(()=>buildBlindReplayPrediction(input),/Prior hit in this action prevents outcome-free target HP\/Block reconstruction/);
});

test('current-build Fixed freeze requires its specific original-runtime evidence before writing',()=>{
  const input=fixture(111),directory=mkdtempSync(join(root,'research/observations/fixed-freeze-test-'));
  const id=`fixed-freeze-test-${process.pid}`,publicDir=join(root,'research/evidence/holdouts',id);
  try{
    input.index.inputSha256='c'.repeat(64);
    const indexFile=join(directory,'index.json'),decodedFile=join(directory,'decoded.json');
    writeFileSync(indexFile,JSON.stringify(input.index));
    writeFileSync(decodedFile,JSON.stringify({kind:'MORIMENS_DECODED_REPLAY',inputSha256:input.index.inputSha256,decoded:{resourceRecords:{Skill:input.skills,Cmd:input.commands,MonsterConfig:input.monsters,AwakerConfig:input.awakeners}}}));
    mkdirSync(publicDir,{recursive:true});
    const captureFile=join(publicDir,'capture.json');
    writeFileSync(captureFile,JSON.stringify({schemaVersion:1,kind:'MORIMENS_REPLAY_SESSION_CAPTURE_EVIDENCE',status:'REVIEWED_SAME_SESSION_CONTROLLED_PVE_CAPTURE',analysisTrack:'verification',build:{id:'pc-res151-build51'},containerSha256:input.index.inputSha256,combatDomain:'PVE_MONSTER_TARGETS',baselineCommitment:{sha256:'1'.repeat(64),privateBaselineSha256:'2'.repeat(64)},privateCaptureCommitment:{sha256:'3'.repeat(64)},privateAttestationCommitment:{sha256:'4'.repeat(64)},sessionChecks:{sameProcessStart:true,sameExecutable:true,installedBuildUnchanged:true,newReferenceAbsentFromBaseline:true,controlledPveBattleConfirmed:true,containerPreservedBeforeDecode:true}}));
    const options={indexFile:relative(root,indexFile),decodedFile:relative(root,decodedFile),id,recordedCombatBuild:'pc-res151-build51',captureEvidenceFile:relative(root,captureFile),buildEvidenceFiles:['research/evidence/pc-res144-to-res151-combat-build.json','research/evidence/pc-res151-replay-adapter-compatibility.json']};
    assert.throws(()=>freezeBlindReplayPrediction(options),/Fixed-runtime comparison report/);
    assert.equal(existsSync(join(publicDir,'scenario.json')),false);
    const frozen=freezeBlindReplayPrediction({...options,buildEvidenceFiles:[...options.buildEvidenceFiles,'research/evidence/pc-res151-fixed-pure-runtime.json']});
    assert.equal(frozen.predictedDamage,111);
    const record=JSON.parse(readFileSync(join(publicDir,'prediction-freeze.json'),'utf8'));
    assert.equal(record.recordedBuild.id,'pc-res151-build51');
    assert.equal(record.recordedBuild.evidence.length,3);
  }finally{rmSync(directory,{recursive:true,force:true});rmSync(publicDir,{recursive:true,force:true});}
});
