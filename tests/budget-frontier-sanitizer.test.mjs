import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

function runPython(code){const run=spawnSync('python',['-c',code],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);return JSON.parse(run.stdout);}

test('budget frontier sanitizer publishes named catalog builds without private replay coordinates',()=>{
  const code=`import json\nfrom tools.sanitize_budget_frontiers import sanitize_inventory\nc={'captureLabel':'secret','stageId':123,'battleTid':8,'battleTemplate':'template_3','templateWave':3,'difficultyId':0,'combatDomain':'PVE_MONSTER_TARGETS','investmentSignals':{'characterLevelSum':250,'highestCharacterLevel':70,'maxLevelCharacterCount':0,'potencyLevelSum':20,'highestPotencyLevel':8,'slotLevelSum':100,'wheelEnhancement':None},'roster':[{'awakenerId':9,'awakenerName':'Test','level':60,'potencyLevel':4,'breakLevel':2,'likeLevel':3,'slotLevels':[5]}]}\ni={'kind':'MORIMENS_PRIVATE_REPLAY_INVENTORY','analysisTrack':'budget-scouting','captureCount':1,'pveBudgetEligibleCaptureCount':1,'captures':[c],'pveComparableGroups':[{'candidateCount':1,'frontierCaptureLabels':['secret']}]}\nprint(json.dumps(sanitize_inventory(i,'a'*64),separators=(',',':')))\n`;
  const report=runPython(code),text=JSON.stringify(report);
  assert.equal(report.analysisTrack,'budget-scouting');assert.equal(report.comparisonGroupCount,1);assert.equal(report.frontierCandidateCount,1);
  assert.equal(report.groups[0].frontierCandidates[0].roster[0].awakenerName,'Test');assert.equal(report.groups[0].frontierCandidates[0].investmentSignals.characterLevelSum,250);
  assert.doesNotMatch(text,/secret|captureLabel|stageId|playerUid|battleUuid/);assert.ok(report.claimBoundary.forbidden.includes('cheese classification'));
});

test('budget frontier sanitizer rejects non-PvE or coordinate-mismatched members',()=>{
  const code=`import json\nfrom tools.sanitize_budget_frontiers import sanitize_inventory\ndef row(label,domain,tid):return {'captureLabel':label,'stageId':1,'battleTid':tid,'battleTemplate':'x_1','templateWave':1,'difficultyId':0,'combatDomain':domain,'investmentSignals':{},'roster':[]}\nerrors=[]\nfor rows in [[row('a','PVP_PLAYER_TARGETS',1)],[row('a','PVE_MONSTER_TARGETS',1),row('b','PVE_MONSTER_TARGETS',2)]]:\n i={'kind':'MORIMENS_PRIVATE_REPLAY_INVENTORY','analysisTrack':'budget-scouting','captures':rows,'pveComparableGroups':[{'candidateCount':len(rows),'frontierCaptureLabels':[r['captureLabel'] for r in rows]}]}\n try:sanitize_inventory(i,'a'*64)\n except ValueError as e:errors.append(str(e))\nprint(json.dumps(errors))\n`;
  const errors=runPython(code);assert.match(errors[0],/routed PvE/);assert.match(errors[1],/exact public comparison coordinates/);
});
