import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync(new URL('../research/evidence/final-evolution-mechanic.json',import.meta.url)));

test('Final Evolution selected rows match both PC catalogs',()=>{
  assert.equal(report.analysisTrack,'mechanics');assert.equal(report.status,'EXACT_CATALOG_MATCH');assert.equal(report.normalizedMatches.length,7);
  const rows=report.rows.Cmd['60401'].data_list;
  assert.deepEqual(Object.values(rows).map(row=>[row.Type,row.Target,row.Para]),[
    ['BEAddState','CmdCaster','60089,20'],['BEAddState','CmdCaster','2900,Arg1'],['BEMonsterBubble','CmdCaster','Monster_Chapter8_08,8000'],['BEAddState','CmdCaster',60404]
  ]);
});

test('later reinforcement is gated by negative HP change and clears before the next bout',()=>{
  const listener=report.rows.State['60404'],temporary=report.rows.State['60083'];
  assert.equal(listener.Judgement1,'TriggerValue<0');assert.equal(listener.TriggerCmd1,60402);
  assert.equal(report.rows.Cmd['60402'].data_list['1'].Para,'60083,2');
  assert.deepEqual(temporary.ClearCond,{'1':'BSTBeforeBoutBegin','2':'BSTBeforeBattleEnd'});assert.equal(temporary.MaxLayer,99);
});
