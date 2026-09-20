import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('public rule metadata preserves claims and scope without private source locations',()=>{
  const registry=JSON.parse(readFileSync(new URL('../research/evidence/registry.json',import.meta.url)));
  const catalog=JSON.parse(readFileSync(new URL('../website/dist/rules.json',import.meta.url)));
  assert.equal(catalog.build,registry.build);assert.equal(catalog.entries.length,registry.entries.length);
  for(const [i,row] of catalog.entries.entries()){
    const original=registry.entries[i];assert.equal(row.id,original.id);assert.equal(row.claim,original.claim);assert.equal(row.scope,original.scope);assert.equal(row.gameplayValidation,original.gameplayValidation);
    for(const source of row.sources){assert.deepEqual(Object.keys(source).sort(),['member','module','sha256']);assert.match(source.sha256,/^[a-f0-9]{64}$/);}
  }
  assert.equal(JSON.stringify(catalog).includes('privateSourcePath'),false);
});
