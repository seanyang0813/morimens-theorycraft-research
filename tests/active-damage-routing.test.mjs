import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {routeActiveDamageRepetition} from '../engine/active-damage-command.mjs';

const suite=JSON.parse(readFileSync(new URL('./synthetic/original-active-damage-routing.json',import.meta.url)));
test('Active repetition routing matches original owner, delay, retarget and creation behavior',()=>{
  for(const fixture of suite.fixtures)assert.deepEqual(routeActiveDamageRepetition(fixture.input),fixture.expected);
});
test('Active routing rejects incomplete inputs',()=>{
  assert.throws(()=>routeActiveDamageRepetition({}),/Exact/);
});
