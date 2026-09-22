import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

function compare(afterValue){
  const script=`import json\nfrom tools.compare_pc_build_reports import compare_reports\ndef r(build,value):return {'kind':'MORIMENS_PC_COMBAT_BUILD_COMPARISON','currentBuild':build,'combatModules':[{'name':'A.lua','current':[{'sha256':value,'size':1}]}]}\nprint(json.dumps(compare_reports(r('before','a'),r('after',${JSON.stringify(afterValue)}),'b'*64,'c'*64)))`;
  const run=spawnSync('python',['-c',script],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);return JSON.parse(run.stdout);
}

test('PC build carry-forward requires exact tracked combat module content',()=>{
  const same=compare('a');assert.equal(same.status,'TRACKED_COMBAT_MODULES_IDENTICAL');assert.equal(same.moduleCount,1);
  const changed=compare('z');assert.equal(changed.status,'REVALIDATION_REQUIRED');assert.equal(changed.modules[0].status,'CHANGED');
  assert.match(same.limitations[0],/complete runtime dependency set/);
});
