import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

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
