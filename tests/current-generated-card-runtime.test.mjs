import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync(new URL('../research/evidence/pc-res150-generated-card-runtime.json',import.meta.url)));

test('current generated-card runtime dependencies reproduce all inherited fixtures',()=>{
  assert.equal(report.kind,'MORIMENS_PC_GENERATED_CARD_RUNTIME_COMPARISON');assert.equal(report.currentBuild,'pc-res150-build51');assert.equal(report.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');assert.equal(report.fixtures,22);assert.deepEqual(report.domains.map(row=>[row.domain,row.fixtures,row.exactMatch]),[['create',7,true],['add',5,true],['owner',6,true],['command',4,true]]);
});
