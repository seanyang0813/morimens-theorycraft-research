import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildBlindReplayPrediction} from '../engine/replay-blind-prediction.mjs';
import {freezeBlindReplayPrediction} from '../tools/freeze_blind_replay_prediction.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));

const properties={hp:1000,max_hp:1000,block:0,crit:0,crit_damage:150};
const fixture=castDamage=>({
  index:{kind:'MORIMENS_REPLAY_EVENT_INDEX',build:'pc-res144-build51',actionSnapshots:[{actionIndex:0,boundaryStatus:'COMPLETE',cardUid:30,camp:1,
    roles:{'1':{uid:1,tid:101,camp:1,roleType:1,breakSkillLevel:0,potencyLevel:0,properties:{...properties,crit:0}},'2':{uid:2,tid:201,camp:2,roleType:2,properties:{...properties}},'3':{uid:3,tid:0,camp:1,roleType:3,properties:{...properties}}},
    cards:{'30':{uid:30,tid:10,ownerUid:1,camp:1,cardArgs:{1:100},properties:{crit:0}}},activeStates:[],window:{selectedTargetCommands:[{data:{uids:[2]}}],hits:[{recordIndex:4,frameIndex:2,data:{roleUid:2,beHitConfig:{castRoleUid:1,skillConfigId:10,damageType:1,castDamage,isCrit:false,oldHp:1000,blockLose:0}}}],
      hitSnapshots:[{hitIndex:0,recordIndex:4,frameIndex:2,boundaryStatus:'COMPLETE',roles:{'1':{uid:1,tid:101,camp:1,roleType:1,breakSkillLevel:0,potencyLevel:0,properties:{...properties,crit:0}},'2':{uid:2,tid:201,camp:2,roleType:2,properties:{...properties,hp:900}},'3':{uid:3,tid:0,camp:1,roleType:3,properties:{...properties}}},cards:{'30':{uid:30,tid:10,ownerUid:1,camp:1,cardArgs:{1:100},properties:{crit:0}}},activeStates:[],hitData:{roleUid:2,beHitConfig:{castRoleUid:1,skillConfigId:10,damageType:1,castDamage,isCrit:false,oldHp:1000,blockLose:0}},reconstruction:{targetHp:'outcome'}}]}}]},
  skills:{'10':{ID:10,CmdList:20,Type:{1:'Card_Strike'}}},commands:{'20':{data_list:{1:{Type:'BEActiveDamage',Target:'UpperTarget',Para:'Arg1'}}}},monsters:{'201':{ID:201,BattleTag:'Boss'}},awakeners:{'101':{ID:101,School:1}}
});

test('blind replay prediction is invariant to hidden damage and restores pre-action target HP',()=>{
  const a=buildBlindReplayPrediction(fixture(250)),b=buildBlindReplayPrediction(fixture(999999));
  assert.equal(a.predictedDamage,100);assert.equal(a.scenario.targetProperties.hp,1000);
  assert.equal(a.sealedProjectionSha256,b.sealedProjectionSha256);
  assert.equal(a.routing.targetBindingSource,'identity-only-preoutcome');
  assert.equal(JSON.stringify(a).includes('999999'),false);
});

test('blind replay prediction supports multiple living enemies while conditioning only on hit identity',()=>{
  const input=fixture(250),action=input.index.actionSnapshots[0],snapshot=action.window.hitSnapshots[0];
  action.roles['4']={uid:4,tid:202,camp:2,roleType:2,properties:{...properties,hp:700}};
  snapshot.roles['4']={uid:4,tid:202,camp:2,roleType:2,properties:{...properties,hp:700}};
  input.monsters['202']={ID:202,BattleTag:'Elite'};
  const result=buildBlindReplayPrediction(input);
  assert.equal(result.predictedDamage,100);
  assert.equal(result.scenario.targetProperties.hp,1000);
  assert.match(result.selectionPolicy,/identity-only/);
  assert.ok(result.unresolvedDependencies.some(item=>/Target selection/.test(item)));
});

test('blind replay prediction rejects chance-dependent critical outcomes',()=>{
  const input=fixture(250);input.index.actionSnapshots[0].roles['1'].properties.crit=50;input.index.actionSnapshots[0].window.hitSnapshots[0].roles['1'].properties.crit=50;
  assert.throws(()=>buildBlindReplayPrediction(input),/No blind deterministic replay candidate/);
});

test('blind replay freeze pins an explicitly evidenced resource-150 build',()=>{
  const input=fixture(250),privateDir=mkdtempSync(join(root,'research/observations/blind-build-test-')),id=`blind-build-test-${process.pid}`;
  const publicDir=join(root,'research/evidence/holdouts',id);
  try{
    input.index.inputSha256='a'.repeat(64);
    const indexFile=join(privateDir,'index.json'),decodedFile=join(privateDir,'decoded.json');
    writeFileSync(indexFile,JSON.stringify(input.index));
    writeFileSync(decodedFile,JSON.stringify({kind:'MORIMENS_DECODED_REPLAY',inputSha256:input.index.inputSha256,decoded:{resourceRecords:{Skill:input.skills,Cmd:input.commands,MonsterConfig:input.monsters,AwakerConfig:input.awakeners}}}));
    const buildEvidence='research/evidence/pc-res144-to-res150-combat-build.json';
    const result=freezeBlindReplayPrediction({indexFile:relative(root,indexFile),decodedFile:relative(root,decodedFile),id,recordedCombatBuild:'pc-res150-build51',buildEvidenceFiles:[buildEvidence],now:()=>new Date('2026-09-21T00:00:00Z')});
    const freeze=JSON.parse(readFileSync(join(publicDir,'prediction-freeze.json'),'utf8')),evidence=JSON.parse(readFileSync(join(publicDir,'preoutcome-evidence.json'),'utf8'));
    assert.equal(result.predictedDamage,100);assert.equal(freeze.recordedBuild.id,'pc-res150-build51');assert.equal(freeze.prediction.runtimeContract.fullRuntimeFingerprint,freeze.prediction.runtimeFingerprint);assert.equal(evidence.recordedCombatBuild,'pc-res150-build51');
    const invalid=join(privateDir,'invalid-build.json'),invalidId=`blind-invalid-build-${process.pid}`;writeFileSync(invalid,'{}');
    assert.throws(()=>freezeBlindReplayPrediction({indexFile:relative(root,indexFile),decodedFile:relative(root,decodedFile),id:invalidId,recordedCombatBuild:'pc-res150-build51',buildEvidenceFiles:[relative(root,invalid)]}),/recognized build report/);
    assert.equal(existsSync(join(root,'research/evidence/holdouts',invalidId)),false);
  }finally{rmSync(privateDir,{recursive:true,force:true});rmSync(publicDir,{recursive:true,force:true});}
});
test('blind replay freeze requires both resource-151 build identity and adapter compatibility',()=>{
  const input=fixture(250),privateDir=mkdtempSync(join(root,'research/observations/blind-build151-test-')),id=`blind-build151-test-${process.pid}`;
  const publicDir=join(root,'research/evidence/holdouts',id),missingId=`blind-build151-missing-${process.pid}`;
  try{
    input.index.inputSha256='b'.repeat(64);
    const indexFile=join(privateDir,'index.json'),decodedFile=join(privateDir,'decoded.json');
    writeFileSync(indexFile,JSON.stringify(input.index));
    writeFileSync(decodedFile,JSON.stringify({kind:'MORIMENS_DECODED_REPLAY',inputSha256:input.index.inputSha256,decoded:{resourceRecords:{Skill:input.skills,Cmd:input.commands,MonsterConfig:input.monsters,AwakerConfig:input.awakeners}}}));
    const build='research/evidence/pc-res144-to-res151-combat-build.json',compatibility='research/evidence/pc-res151-replay-adapter-compatibility.json';
    assert.throws(()=>freezeBlindReplayPrediction({indexFile:relative(root,indexFile),decodedFile:relative(root,decodedFile),id:missingId,recordedCombatBuild:'pc-res151-build51',buildEvidenceFiles:[build]}),/adapter compatibility report/);
    assert.equal(existsSync(join(root,'research/evidence/holdouts',missingId)),false);
    const result=freezeBlindReplayPrediction({indexFile:relative(root,indexFile),decodedFile:relative(root,decodedFile),id,recordedCombatBuild:'pc-res151-build51',buildEvidenceFiles:[build,compatibility],now:()=>new Date('2026-09-22T00:00:00Z')});
    const freeze=JSON.parse(readFileSync(join(publicDir,'prediction-freeze.json'),'utf8'));
    assert.equal(result.predictedDamage,100);assert.equal(freeze.recordedBuild.id,'pc-res151-build51');assert.equal(freeze.recordedBuild.evidence.length,2);
  }finally{rmSync(privateDir,{recursive:true,force:true});rmSync(publicDir,{recursive:true,force:true});rmSync(join(root,'research/evidence/holdouts',missingId),{recursive:true,force:true});}
});
