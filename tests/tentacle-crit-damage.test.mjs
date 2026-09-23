import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tentacleCritDamage} from '../engine/tentacle-crit-damage.mjs';

const fixture=JSON.parse(readFileSync(new URL('./synthetic/installed-tentacle-crit-damage.json',import.meta.url),'utf8'));
test('regional Tentacle Crit DMG follows the installed original over synthetic cases',()=>{
  assert.equal(fixture.fixtures.length,308);
  for(const {input,expected} of fixture.fixtures)
    assert.equal(tentacleCritDamage({build:fixture.build,...input}).value,expected);
});
test('critical bonus requires an explicit region and nonempty Awaker list',()=>{
  assert.throws(()=>tentacleCritDamage({build:fixture.build,japan:false,outsideCritDamage:0,awakerCritDamage:[]}));
  assert.throws(()=>tentacleCritDamage({build:fixture.build,outsideCritDamage:0,awakerCritDamage:[50]}));
});
