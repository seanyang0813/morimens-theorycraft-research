import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {playerTentacleShowDamage} from '../engine/player-tentacle-show-damage.mjs';

const fixture=JSON.parse(readFileSync(new URL('./synthetic/installed-player-tentacle-show-damage.json',import.meta.url)));
test('Tentacle show alias matches installed original Lua',()=>{
  assert.equal(fixture.method,'BattleUnitPlayer.GetShowTentacleDamage');
  for(const row of fixture.fixtures)assert.equal(playerTentacleShowDamage(row.input).value,row.expected);
});

test('show alias rejects unknown numeric inputs',()=>{
  assert.throws(()=>playerTentacleShowDamage({playerProperties:{tentacle_dmg:NaN},awakerProperties:[]}));
  assert.throws(()=>playerTentacleShowDamage({playerProperties:{},awakerProperties:[null]}));
});
