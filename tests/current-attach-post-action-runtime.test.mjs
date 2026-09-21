import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planAttachPostAction} from '../engine/attach-post-action.mjs';

const report=JSON.parse(readFileSync(new URL('../research/evidence/pc-res150-attach-post-action-runtime.json',import.meta.url)));
const fixtures=JSON.parse(readFileSync(new URL('./synthetic/original-attach-post-action.json',import.meta.url)));

test('installed resource-150 attach-post action matches the inherited request domain',()=>{
  assert.equal(report.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');
  assert.equal(report.fixtures,8);assert.equal(report.exactMatches,8);assert.equal(report.mismatches,0);
  for(const {input,expected} of fixtures.fixtures){
    const actual=planAttachPostAction({schemaVersion:1,kind:'morimens-attach-post-action',build:'pc-res150-build51',...input,targetIsMonster:false});
    for(const key of ['initialization','propertyReads','records','cardRequests','returned'])assert.deepEqual(actual[key],expected[key]);
  }
});
