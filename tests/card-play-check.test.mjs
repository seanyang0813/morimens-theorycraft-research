import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkPveCardPlay} from '../engine/card-play-check.mjs';
test('PvE card checks match original rejection and ignore-cost reset behavior',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-card-play-check.json',import.meta.url)));
  for(const {input,expected} of evidence.fixtures){const result=checkPveCardPlay(input);for(const key of Object.keys(expected))assert.equal(result[key],expected[key],JSON.stringify(input));}
});
