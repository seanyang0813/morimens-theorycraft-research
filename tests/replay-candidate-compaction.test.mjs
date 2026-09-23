import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('candidate compaction retains adapter fields and removes unrelated window payloads',()=>{
  const code=`import json,sys\nsys.path.insert(0,'tools')\nfrom compact_replay_candidate_index import compact_candidate_index\ni={'kind':'MORIMENS_REPLAY_EVENT_INDEX','build':'pc-res144-build51','inputSha256':'a'*64,'counts':{'records':2,'events':9},'snapshotBoundaryStatus':'COMPLETE','unknownCommands':[],'unknownEvents':[],'hits':[{'hitIndex':0}],'hitSnapshots':[{'boundaryStatus':'COMPLETE'},{'boundaryStatus':'INCOMPLETE'}],'actionSnapshots':[{'actionIndex':0,'boundaryStatus':'COMPLETE','cardUid':30,'camp':1,'roles':{'1':{'uid':1}},'activeStates':[{'ownerUid':1,'stateId':2,'layer':3}],'cards':{'30':{'uid':30},'31':{'uid':31}},'window':{'events':[1,2,3],'selectedTargetCommands':[{'data':{'uids':[2]}}],'hits':[{'recordIndex':4}],'hitSnapshots':[{'hitIndex':0,'recordIndex':4,'frameIndex':2,'boundaryStatus':'COMPLETE','roles':{'1':{}},'cards':{'30':{'uid':30},'31':{'uid':31}},'activeStates':[],'hitData':{'roleUid':2},'reconstruction':{'x':1},'unused':'drop'}]}}]}\nprint(json.dumps(compact_candidate_index(i),separators=(',',':')))\n`;
  const run=spawnSync('python',['-c',code],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);
  const result=JSON.parse(run.stdout),action=result.actionSnapshots[0],hit=action.window.hitSnapshots[0];
  assert.deepEqual(Object.keys(action).sort(),['actionIndex','activeStates','boundaryStatus','camp','cardUid','cards','roles','window']);
  assert.deepEqual(action.roles,{'1':{'uid':1}});assert.deepEqual(action.activeStates,[{'ownerUid':1,'stateId':2,'layer':3}]);
  assert.deepEqual(Object.keys(action.cards),['30']);assert.equal(Object.hasOwn(action.window,'events'),false);
  assert.deepEqual(Object.keys(hit.cards),['30']);assert.equal(Object.hasOwn(hit,'unused'),false);
  assert.deepEqual(action.window.selectedTargetCommands,[{data:{uids:[2]}}]);assert.deepEqual(action.window.hits,[{recordIndex:4}]);
  assert.equal(result.summary.completeHitSnapshots,1);
  assert.deepEqual(result.counts,{records:2,events:9,cardUses:1,hits:1});assert.equal(result.snapshotBoundaryStatus,'COMPLETE');
  assert.deepEqual(result.unknownCommands,[]);assert.deepEqual(result.unknownEvents,[]);
});
