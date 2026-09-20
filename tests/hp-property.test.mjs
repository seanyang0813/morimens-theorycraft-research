import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {subtractOrdinaryHp} from '../engine/hp-property.mjs';
const oracle=JSON.parse(readFileSync(new URL('./synthetic/original-hp-property.json',import.meta.url)));
for(const f of oracle.fixtures)assert.deepEqual(subtractOrdinaryHp(f.input),f.expected);
assert.throws(()=>subtractOrdinaryHp({hp:1,request:Infinity}));
assert.throws(()=>subtractOrdinaryHp({hp:-1,request:1}));
