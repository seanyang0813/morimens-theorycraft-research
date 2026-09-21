import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planAttachPostAction} from '../engine/attach-post-action.mjs';

const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-attach-post-action.json',import.meta.url)));

test('attach-post plans reproduce every original non-monster request fixture',()=>{
  for(const {input,expected} of evidence.fixtures){
    const actual=planAttachPostAction({schemaVersion:1,kind:'morimens-attach-post-action',build:'pc-res144-build51',...input,targetIsMonster:false});
    for(const key of ['initialization','propertyReads','records','cardRequests','returned'])assert.deepEqual(actual[key],expected[key]);
  }
});

test('attach-post planner rejects unsupported targets, builds and sparse parameters',()=>{
  const base={schemaVersion:1,kind:'morimens-attach-post-action',build:'pc-res144-build51',parameters:[133381,1,0,1,7],casterUid:77,targetUid:99,casterSealAttachPost:0,targetPresent:true,targetIsMonster:false};
  assert.throws(()=>planAttachPostAction({...base,targetIsMonster:true}),/non-monster/);
  assert.throws(()=>planAttachPostAction({...base,build:'pc-res150-build51'}),/resource-144/);
  assert.throws(()=>planAttachPostAction({...base,parameters:[133381,,0]}),/Sparse|request/);
});
