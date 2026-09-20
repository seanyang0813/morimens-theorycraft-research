import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeSkillArguments} from '../engine/skill-arguments.mjs';
const data=JSON.parse(readFileSync(new URL('./synthetic/original-skill-arguments.json',import.meta.url)));
for(const f of data.fixtures)assert.deepEqual(normalizeSkillArguments(f.input.raw,f.input.override),f.expected);
assert.throws(()=>normalizeSkillArguments([,1],[]));
assert.throws(()=>normalizeSkillArguments([Infinity],[]));
