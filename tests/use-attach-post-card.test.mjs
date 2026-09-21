import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planUseAttachPostCard} from '../engine/use-attach-post-card.mjs';

const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-use-attach-post-card.json',import.meta.url)));
const request=input=>({schemaVersion:1,kind:'morimens-use-attach-post-card',build:'pc-res144-build51',skillId:input.skillId,skillLevel:input.skillLevel,camp:input.camp,ownerUid:input.ownerUid,cardUid:input.cardUid,targetType:input.targetType,hasPre:input.hasPre,isTriggerBST:input.isTriggerBST});

test('UseAttachPostCard planner reproduces every original request-chain fixture',()=>{
  for(const {input,expected} of evidence.fixtures){
    const actual=planUseAttachPostCard(request(input));
    for(const key of ['returned','events','mainCommandAttachPostParam'])assert.deepEqual(actual[key],expected[key],input.name);
  }
});

test('UseAttachPostCard planner rejects implicit, invalid and other-build inputs',()=>{
  const base=request(evidence.fixtures[0].input);
  assert.throws(()=>planUseAttachPostCard({...base,build:'pc-res151-build51'}),/supported-build/);
  assert.throws(()=>planUseAttachPostCard({...base,skillLevel:0}),/Positive/);
  assert.throws(()=>planUseAttachPostCard({...base,hasPre:1}),/flags/);
  assert.throws(()=>planUseAttachPostCard({...base,extra:true}),/input/);
});
