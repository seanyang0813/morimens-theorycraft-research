import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {playerTentacleDamage} from '../engine/player-tentacle-damage.mjs';

const fixture=JSON.parse(readFileSync(new URL('./synthetic/installed-player-tentacle-damage.json',import.meta.url),'utf8'));
test('player Tentacle damage matches installed original bytecode across resolved synthetic inputs',()=>{
  assert.equal(fixture.fixtures.length,377);
  for(const {input,expected} of fixture.fixtures){
    assert.equal(input.powerAddPer,-100);
    const {powerAddPer,...rest}=input;
    assert.equal(playerTentacleDamage({build:fixture.build,...rest}).value,expected);
  }
});
test('stored tentacle_dmg is only one term of computed PlayerRole.tentacle_dmg',()=>{
  const {powerAddPer,...input}=fixture.fixtures[1].input;
  assert.equal(input.player.tentacle_dmg,38);
  assert.equal(playerTentacleDamage({build:fixture.build,...input}).value,230);
});
