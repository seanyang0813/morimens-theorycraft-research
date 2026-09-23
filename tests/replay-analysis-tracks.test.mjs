import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {classifyReplayCombatDomain} from '../engine/replay-combat-domain.mjs';

function runPython(code){
  const run=spawnSync('python',['-c',code],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  return JSON.parse(run.stdout);
}

test('replay domain preflight routes complete targets without reading outcomes',()=>{
  const index={kind:'MORIMENS_REPLAY_EVENT_INDEX',inputSha256:'a'.repeat(64),actionSnapshots:[{window:{hits:[{recordIndex:1,frameIndex:2,data:{roleUid:9,beHitConfig:{castDamage:999}}}],hitSnapshots:[{recordIndex:1,frameIndex:2,boundaryStatus:'COMPLETE',roles:{'9':{roleType:3}}}]}}]};
  const result=classifyReplayCombatDomain(index);
  assert.equal(result.inputSha256,'a'.repeat(64));assert.deepEqual(result.targetRoleTypes,{Player:1});assert.equal(result.combatDomain,'PVP_PLAYER_TARGETS');
  delete index.actionSnapshots[0].window.hits[0].data.beHitConfig;
  assert.deepEqual(classifyReplayCombatDomain(index),result);
  const pve=classifyReplayCombatDomain(index,{battleDat:{battleTid:8},battleConfig:{ID:8,BattleType:'Boss',Monster1:99}});
  assert.equal(pve.combatDomain,'PVE_MONSTER_TARGETS');assert.equal(pve.classificationBasis,'REPLAY_EMBEDDED_BOSS_CONFIG_WITH_MONSTER');assert.equal(pve.battleTid,8);assert.deepEqual(pve.targetRoleTypes,{Player:1});
  const mismatched=classifyReplayCombatDomain(index,{battleDat:{battleTid:8},battleConfig:{ID:9,BattleType:'Boss',Monster1:99}});
  assert.equal(mismatched.combatDomain,'PVP_PLAYER_TARGETS');assert.equal(mismatched.classificationBasis,'COMPLETE_HIT_TARGET_ROLE_TYPES');
});

test('strategy summaries carry an explicit analysis track and comparison coordinates',()=>{
  const code=`import json\nfrom tools.replay_strategy_summary import build_strategy_summary\ns=build_strategy_summary({'actionSnapshots':[],'counts':{}},{},analysis_track='cheese-analysis',stage='dtide-3',wave=2,difficulty='hard')\nprint(json.dumps(s,separators=(',',':')))\n`;
  const result=runPython(code);
  assert.equal(result.schemaVersion,2);
  assert.equal(result.analysisTrack,'cheese-analysis');
  assert.match(result.claimBoundary.purpose,/unusual observed result/);
  assert.ok(result.claimBoundary.mustNotClaim.includes('optimal general build'));
  assert.match(result.claimBoundary.crossTrackUse,/separate theorycraft artifact/);
  assert.deepEqual([result.stage,result.wave,result.difficulty],['dtide-3',2,'hard']);
});

test('budget frontier accepts only one explicitly comparable budget-scouting group',()=>{
  const code=`import json\nfrom tools.rank_budget_replays import build_budget_report\ndef s(track='budget-scouting',stage='dtide-3',level=70):return {'kind':'MORIMENS_PRIVATE_STRATEGY_SUMMARY','analysisTrack':track,'stage':stage,'wave':2,'difficulty':'hard','investmentSignals':{'characterLevelSum':level},'roster':[],'counts':{}}\nok=build_budget_report([('a',s(level=70)),('b',s(level=80))])\nerrors=[]\nfor rows in [[('x',s(track='cheese-analysis'))],[('a',s()),('b',s(stage='dtide-4'))]]:\n try:build_budget_report(rows)\n except ValueError as e:errors.append(str(e))\nprint(json.dumps({'frontier':ok['frontierCount'],'comparison':ok['comparison'],'errors':errors},separators=(',',':')))\n`;
  const result=runPython(code);
  assert.equal(result.frontier,1);
  assert.deepEqual(result.comparison,{stage:'dtide-3',wave:2,difficulty:'hard'});
  assert.match(result.errors[0],/only budget-scouting/);
  assert.match(result.errors[1],/not from the same/);
});

test('budget frontier CLI writes its report and returns report counts',()=>{
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
  const privateRoot=join(root,'research','observations');
  const dir=mkdtempSync(join(privateRoot,'budget-cli-test-'));
  try{
    const summary={schemaVersion:2,kind:'MORIMENS_PRIVATE_STRATEGY_SUMMARY',analysisTrack:'budget-scouting',stage:'dtide-3',wave:2,difficulty:'hard',investmentSignals:{characterLevelSum:70},roster:[],counts:{}};
    const source=join(dir,'summary.json'),output=join(dir,'frontier.json');
    writeFileSync(source,JSON.stringify(summary));
    const run=spawnSync('python',['tools/rank_budget_replays.py','--summary',source,'--output',output],{cwd:root,encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
    const status=JSON.parse(run.stdout),report=JSON.parse(readFileSync(output,'utf8'));
    assert.equal(status.candidateCount,1);
    assert.equal(status.frontierCount,1);
    assert.equal(report.analysisTrack,'budget-scouting');
    assert.equal(report.frontier.length,1);
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('streaming replay inventory stays in budget scouting and omits identifiers',()=>{
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
  const privateRoot=join(root,'research','observations');
  const dir=mkdtempSync(join(privateRoot,'inventory-cli-test-'));
  try{
    const replayDir=join(dir,'replay-batch-test');mkdirSync(replayDir);
    const index={schemaVersion:1,battleDat:{battleUuid:'secret-replay-id',playerName:'secret-name',playerUid:123456789,battleUid:99,stageId:7,battleTid:8,difficultyId:2,gameplayType:1,roleData:[{uid:42,tid:9,level:60,potencyLevel:2,breakLevel:1,likeLevel:3,slots:[{level:4}]}]},events:[{payload:'large trailing data'}]};
    writeFileSync(join(replayDir,'index.json'),JSON.stringify(index));
    const battle=join(dir,'battle.json'),awaker=join(dir,'awaker.json'),output=join(dir,'inventory.json');
    writeFileSync(battle,JSON.stringify({'8':{ID:8,CnID:'battle-template_3'}}));
    writeFileSync(awaker,JSON.stringify({'9':{ID:9,Name:'key|Test Awakener'}}));
    const run=spawnSync('python',['tools/inventory_private_replays.py','--input-glob',`${dir.split(/[\\/]/).at(-1)}/replay-batch-*/index.json`,'--battle-config',battle,'--awaker-config',awaker,'--output',output],{cwd:root,encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
    const text=readFileSync(output,'utf8'),report=JSON.parse(text);
    assert.equal(report.analysisTrack,'budget-scouting');assert.equal(report.captureCount,1);
    assert.equal(report.captures[0].templateWave,3);assert.equal(report.captures[0].roster[0].awakenerName,'Test Awakener');
    assert.equal(report.captures[0].investmentSignals.characterLevelSum,60);
    assert.equal(report.captures[0].combatDomain,'UNREVIEWED');assert.equal(report.captures[0].eligibleForPveBudget,false);
    assert.equal(report.pveBudgetEligibleCaptureCount,0);assert.deepEqual(report.pveComparableGroups,[]);
    assert.equal(text.includes('secret-replay-id'),false);assert.equal(text.includes('secret-name'),false);assert.equal(text.includes('123456789'),false);
    assert.match(report.limitations[0],/not cheese analysis or theorycrafting evidence/);
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('capture-round publication stays in verification and strips replay rows',()=>{
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
  const dir=mkdtempSync(join(root,'research','observations','capture-round-test-'));
  try{
    const source=join(dir,'private-audit.json'),output=join(dir,'public.json');
    writeFileSync(source,JSON.stringify([{observationId:'private-a',records:3,events:5,cardUses:2,hits:4,completeHitSnapshots:1,completeHitTargetRoleTypes:{'3':1},combatDomain:'PVP_PLAYER_TARGETS',unknownCommands:0,unknownEvents:0,retrospectiveActiveCandidates:1,recordedCritBranchExactChecks:1,recordedCritBranchMismatches:0}]));
    const run=spawnSync('python',['tools/summarize_replay_capture_round.py','--audit',source,'--output',output,'--blind-eligible','0'],{cwd:root,encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
    const report=JSON.parse(readFileSync(output,'utf8'));
    assert.equal(report.analysisTrack,'verification');assert.equal(report.totals.replays,1);
    assert.equal(report.totals.recordedCritBranchExactChecks,1);
    assert.deepEqual(report.totals.completeHitTargetRoleTypes,{Player:1});
    assert.deepEqual(report.totals.combatDomains,{PVP_PLAYER_TARGETS:1});
    assert.equal(Object.hasOwn(report,'replays'),false);assert.equal(JSON.stringify(report).includes('private-a'),false);
    assert.ok(report.claimBoundary.forbidden.includes('cheese classification'));
    assert.ok(report.claimBoundary.forbidden.includes('optimal theorycraft sequence'));
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('live-session baseline publishes only a pre-battle commitment',()=>{
  const text=readFileSync('research/evidence/current-session-replay-baseline.json','utf8'),report=JSON.parse(text);
  assert.equal(report.kind,'MORIMENS_REPLAY_SESSION_BASELINE_COMMITMENT');assert.equal(report.status,'COMMITTED_PRE_BATTLE_BASELINE');
  assert.equal(report.analysisTrack,'verification');assert.equal(report.build.id,'pc-res150-build51');
  assert.equal(report.privateBaselineCommitment.identifiersPublished,false);assert.match(report.privateBaselineCommitment.sha256,/^[0-9a-f]{64}$/);
  assert.match(report.limitations[0],/does not .*establish the recorded combat build/);
  assert.doesNotMatch(text,/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
});

test('session capture candidate binds a new PvE container but remains unreviewed',()=>{
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),privateDir=mkdtempSync(join(root,'research','observations','session-capture-test-')),attestationDir=mkdtempSync(join(root,'research','raw','session-attestation-test-')),publicDir=mkdtempSync(join(root,'research','evidence','session-capture-test-'));
  const hash=value=>createHash('sha256').update(value).digest('hex');
  try{
    const install=join(privateDir,'install'),download=join(install,'_game_data_','DownLoad');mkdirSync(download,{recursive:true});
    writeFileSync(join(install,'Morimens.exe'),'exe');writeFileSync(join(download,'_version.json'),'version');
    const bundles={};for(const name of ['share.ab','gamescript.ab','foundation.ab']){writeFileSync(join(download,name),name);bundles[name]={sha256:hash(name),size:name.length};}
    const build={schemaVersion:1,kind:'MORIMENS_PC_COMBAT_BUILD_COMPARISON',currentBuild:'pc-test',sourceHashes:{versionManifest:hash('version'),bundles}};
    const buildPath=join(privateDir,'build.json');writeFileSync(buildPath,JSON.stringify(build));
    const process={pid:7,startedAtUtc:'2026-09-21T00:00:00+00:00',executableSha256:hash('exe')};
    const baseline={schemaVersion:1,kind:'MORIMENS_PRIVATE_REPLAY_SESSION_BASELINE',capturedAtUtc:'2026-09-21T01:00:00+00:00',process,bytesRead:10,replayReferences:[]};
    const baselinePath=join(privateDir,'baseline.json');writeFileSync(baselinePath,JSON.stringify(baseline));const baselineSha=hash(readFileSync(baselinePath));
    const publicBaseline={schemaVersion:1,kind:'MORIMENS_REPLAY_SESSION_BASELINE_COMMITMENT',status:'COMMITTED_PRE_BATTLE_BASELINE',build:{id:'pc-test'},privateBaselineCommitment:{sha256:baselineSha}};
    const publicBaselinePath=join(publicDir,'baseline.json');writeFileSync(publicBaselinePath,JSON.stringify(publicBaseline));
    const container=Buffer.from('{"compStr":"opaque"}'),containerPath=join(privateDir,'candidate.json');writeFileSync(containerPath,container);const containerSha=hash(container);
    const delta={schemaVersion:1,kind:'MORIMENS_PRIVATE_REPLAY_SESSION_DELTA',capturedAtUtc:'2026-09-21T01:02:00+00:00',privateBaselineSha256:baselineSha,process,results:[{uuid:'11111111-1111-1111-1111-111111111111',privateFile:'candidate.json',sha256:containerSha,bytes:container.length,validContainer:true,objectLastModifiedUtc:'2026-09-21T01:01:00+00:00'}]};
    const deltaPath=join(privateDir,'delta.json');writeFileSync(deltaPath,JSON.stringify(delta));
    const domainPath=join(privateDir,'domain.json');writeFileSync(domainPath,JSON.stringify({schemaVersion:1,kind:'MORIMENS_REPLAY_COMBAT_DOMAIN',inputSha256:containerSha,combatDomain:'PVE_MONSTER_TARGETS',completeHitSnapshots:1}));
    const output=join(publicDir,'candidate.json'),run=spawnSync('python',['tools/build_replay_session_capture_evidence.py','--private-baseline',baselinePath,'--private-delta',deltaPath,'--public-baseline',publicBaselinePath,'--build-evidence',buildPath,'--container',containerPath,'--domain-report',domainPath,'--install-root',install,'--candidate-index','0','--output',output],{cwd:root,encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);const report=JSON.parse(readFileSync(output,'utf8'));
    assert.equal(report.status,'CAPTURE_CANDIDATE_REQUIRES_CONTROLLED_BATTLE_REVIEW');assert.equal(report.combatDomain,'PVE_MONSTER_TARGETS');assert.equal(report.sessionChecks.controlledPveBattleConfirmed,false);assert.equal(report.containerSha256,containerSha);
    const attestationPath=join(attestationDir,'attestation.json');writeFileSync(attestationPath,JSON.stringify({schemaVersion:1,kind:'MORIMENS_PRIVATE_CONTROLLED_PVE_ATTESTATION',containerSha256:containerSha,controlledPveBattleCompletedAfterBaseline:true,loadedRecordIsThatBattle:true,attestedAtUtc:new Date(Date.now()+1000).toISOString()}));
    const reviewedPath=join(publicDir,'reviewed.json'),review=spawnSync('python',['tools/review_replay_session_capture.py','--candidate',output,'--private-attestation',attestationPath,'--output',reviewedPath],{cwd:root,encoding:'utf8'});
    assert.equal(review.status,0,review.stderr);const reviewedText=readFileSync(reviewedPath,'utf8'),reviewed=JSON.parse(reviewedText);
    assert.equal(reviewed.status,'REVIEWED_SAME_SESSION_CONTROLLED_PVE_CAPTURE');assert.equal(reviewed.sessionChecks.controlledPveBattleConfirmed,true);assert.match(reviewed.privateAttestationCommitment.sha256,/^[0-9a-f]{64}$/);assert.doesNotMatch(reviewedText,/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  }finally{rmSync(privateDir,{recursive:true,force:true});rmSync(attestationDir,{recursive:true,force:true});rmSync(publicDir,{recursive:true,force:true});}
});
