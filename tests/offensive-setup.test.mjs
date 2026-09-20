import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareNoCardPveOffense, casterSetupKeys, playerSetupKeys} from '../engine/offensive-setup.mjs';
const suite=JSON.parse(readFileSync(new URL('./synthetic/original-offensive-setup.json',import.meta.url)));
// The oracle's declared synthetic domain explicitly defines omitted properties as zero.
const expanded=f=>({...f,build:suite.build,
  caster:{...Object.fromEntries(casterSetupKeys.map(k=>[k,0])),...f.caster},
  player:{...Object.fromEntries(playerSetupKeys.map(k=>[k,0])),...f.player}});
test('setup and utility match both original-bytecode return values',()=>{
  assert.equal(suite.fixtures.length,549);
  for(const f of suite.fixtures){
    const r=prepareNoCardPveOffense(expanded(f.input));
    assert.deepEqual([r.showDamage,r.diagnosticBaseDamage],f.expected,f.id);
    assert.equal(r.finalDamage,null);
  }
});
test('unknown, incomplete and out-of-scope setup inputs rejected',()=>{
  const input=expanded(suite.fixtures[0].input);
  for(const key of casterSetupKeys){const c={...input.caster};delete c[key];assert.throws(()=>prepareNoCardPveOffense({...input,caster:c}));}
  assert.throws(()=>prepareNoCardPveOffense({...input,card:{}}));
  assert.throws(()=>prepareNoCardPveOffense({...input,tags:['Card_Awake']}));
  assert.throws(()=>prepareNoCardPveOffense({...input,tags:['Card_Strike','Card_Strike']}));
});
