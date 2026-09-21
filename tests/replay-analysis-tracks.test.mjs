import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

function runPython(code){
  const run=spawnSync('python',['-c',code],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  return JSON.parse(run.stdout);
}

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

test('capture-round publication stays in verification and strips replay rows',()=>{
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
  const dir=mkdtempSync(join(root,'research','observations','capture-round-test-'));
  try{
    const source=join(dir,'private-audit.json'),output=join(dir,'public.json');
    writeFileSync(source,JSON.stringify([{observationId:'private-a',records:3,events:5,cardUses:2,hits:4,completeHitSnapshots:1,completeHitTargetRoleTypes:{'3':1},unknownCommands:0,unknownEvents:0,retrospectiveActiveCandidates:0}]));
    const run=spawnSync('python',['tools/summarize_replay_capture_round.py','--audit',source,'--output',output,'--blind-eligible','0'],{cwd:root,encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
    const report=JSON.parse(readFileSync(output,'utf8'));
    assert.equal(report.analysisTrack,'verification');assert.equal(report.totals.replays,1);
    assert.deepEqual(report.totals.completeHitTargetRoleTypes,{Player:1});
    assert.equal(Object.hasOwn(report,'replays'),false);assert.equal(JSON.stringify(report).includes('private-a'),false);
    assert.ok(report.claimBoundary.forbidden.includes('cheese classification'));
    assert.ok(report.claimBoundary.forbidden.includes('optimal theorycraft sequence'));
  }finally{rmSync(dir,{recursive:true,force:true});}
});
