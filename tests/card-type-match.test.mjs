import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cardTypeMatch,matchesUltimateEnergyCardTypes,ultimateEnergyCardTypes} from '../engine/card-type-match.mjs';

const fixture=JSON.parse(readFileSync(new URL('./synthetic/original-card-type-match.json',import.meta.url)));

test('authored CardTypeMatch reproduces every original-runtime fixture',()=>{
  assert.equal(fixture.kind,'SYNTHETIC_ORIGINAL_RUNTIME');
  assert.equal(fixture.sourceHash,'cdc402d5e6dfb297d784cca32275a94c470e78e731ea818381c53fc7a704fa53');
  assert.equal(fixture.currentBuildHashStatus,'BYTE_IDENTICAL_PC_RES150_BUILD51');
  for(const row of fixture.fixtures)assert.equal(cardTypeMatch(row.input.cardTypes,row.input.query),row.expected,JSON.stringify(row.input));
});

test('ultimate-energy matching group is the exact source-defined four-type list',()=>{
  assert.deepEqual(ultimateEnergyCardTypes,['Card_Skill','Card_Defend','Card_Extend','Card_Strike']);
  assert.equal(matchesUltimateEnergyCardTypes(['Card_AttachPost','Card_Strike']),true);
  assert.equal(matchesUltimateEnergyCardTypes(['Ulti_Skill']),false);
});

test('card-type matching rejects untyped caller input',()=>{
  assert.throws(()=>cardTypeMatch('Card_Strike','Card_Strike'),/string array/);
  assert.throws(()=>cardTypeMatch([],42),/string array/);
});
