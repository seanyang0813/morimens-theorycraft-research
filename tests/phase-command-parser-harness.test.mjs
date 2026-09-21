import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('phase parser harness initializes Arg1 and LastConditionRet before direct evaluation',()=>{
  const code=`import json,sys\nsys.path.insert(0,'tools')\nfrom phase_command_parser_oracle import PhaseCommandParserOracle\no=PhaseCommandParserOracle()\nrows=[]\nfor flag in (False,True):\n o.begin(37,1000,{},flag)\n rows.append({'flag':flag,'arg':o.evaluate('Arg1'),'last':o.evaluate('LastConditionRet')})\nprint(json.dumps(rows,separators=(',',':')))\n`;
  const run=spawnSync('python',['-c',code],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  assert.deepEqual(JSON.parse(run.stdout),[
    {flag:false,arg:[37],last:[0]},
    {flag:true,arg:[37],last:[1]},
  ]);
});
