import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planUseAttachPostCard} from '../engine/use-attach-post-card.mjs';

const report=JSON.parse(readFileSync(new URL('../research/evidence/pc-res150-use-attach-post-card-runtime.json',import.meta.url)));
const fixtures=JSON.parse(readFileSync(new URL('./synthetic/original-use-attach-post-card.json',import.meta.url)));
const request=input=>({schemaVersion:1,kind:'morimens-use-attach-post-card',build:'pc-res150-build51',skillId:input.skillId,skillLevel:input.skillLevel,camp:input.camp,ownerUid:input.ownerUid,cardUid:input.cardUid,targetType:input.targetType,hasPre:input.hasPre,isTriggerBST:input.isTriggerBST});

test('installed resource-150 UseAttachPostCard matches the inherited request domain',()=>{
  assert.equal(report.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');
  assert.equal(report.fixtures,4);
  assert.equal(report.exactMatches,4);
  assert.equal(report.mismatches,0);
  for(const {input,expected} of fixtures.fixtures){
    const actual=planUseAttachPostCard(request(input));
    for(const key of ['returned','events','mainCommandAttachPostParam'])assert.deepEqual(actual[key],expected[key]);
  }
});
