import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {activeTargetDamage} from '../engine/active-target.mjs';
const data=JSON.parse(readFileSync(new URL('./synthetic/original-card-target.json',import.meta.url)));
for(const f of data.fixtures)assert.equal(activeTargetDamage(f.showDamage,f.input).preHitDamage,f.expected);
