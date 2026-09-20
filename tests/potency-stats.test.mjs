import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculatePotencyAttributes} from '../engine/potency-stats.mjs';
const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-potency-stats.json',import.meta.url)));
test('additional potency attributes match original chain accumulation at every saved endpoint',()=>{
  assert.equal(evidence.fixtures.length,960);
  for(const f of evidence.fixtures){const character=evidence.characters.find(c=>c.characterId===f.characterId);
    const r=calculatePotencyAttributes({build:evidence.build,targetPotencyId:f.targetPotencyId,chain:character.chain});
    assert.deepEqual(r.attributes,f.expected,`${f.characterId} endpoint ${f.targetPotencyId}`);assert.equal(r.finalDamage,null);
  }
});
test('unresolved endpoint and malformed numeric inputs reject',()=>{
  const input={build:evidence.build,targetPotencyId:0,chain:evidence.characters[0].chain};
  assert.throws(()=>calculatePotencyAttributes({...input,targetPotencyId:999999999}));
  assert.throws(()=>calculatePotencyAttributes({...input,targetPotencyId:null}));
  assert.throws(()=>calculatePotencyAttributes({...input,build:'android'}));
});
