import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectFrontEnemy} from '../engine/front-enemy-target.mjs';
const fixtures=JSON.parse(readFileSync(new URL('./synthetic/original-front-enemy.json',import.meta.url))).fixtures;
test('front selection matches 48 original connected cases across both camps',()=>{
 assert.equal(fixtures.length,48);
 for(const {input,expected} of fixtures)assert.deepEqual(selectFrontEnemy(input).targets,expected);
});
test('unproven position ties fail explicitly; locks retain precedence',()=>{
 const v=JSON.parse(JSON.stringify(fixtures[0].input));v.roles[0].position=-1;
 assert.throws(()=>selectFrontEnemy(v),/tie-order/);
 v.lockedUid=11;assert.equal(selectFrontEnemy(v).reason,'locked');
});
