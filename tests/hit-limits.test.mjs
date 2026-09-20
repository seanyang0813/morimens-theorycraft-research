import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveHitLimits} from '../engine/hit-limits.mjs';
const data=JSON.parse(readFileSync(new URL('./synthetic/original-hit-limits.json',import.meta.url)));
for(const f of data.fixtures){const result=resolveHitLimits(f.input);assert.deepEqual(Object.fromEntries(Object.keys(f.expected).map(k=>[k,result[k]])),f.expected);assert.equal(result.finalDamage,null);}
assert.throws(()=>resolveHitLimits({...data.fixtures[0].input,hp:0}));
assert.throws(()=>resolveHitLimits({...data.fixtures[0].input,preventEligible:undefined}));
