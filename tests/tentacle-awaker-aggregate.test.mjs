import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {aggregateTentacleAwakerBonuses} from '../engine/tentacle-awaker-aggregate.mjs';
import {tentaclePreHit} from '../engine/tentacle-prehit.mjs';
import {runTheorycraftRequest} from '../engine/theorycraft-api.mjs';

const fixture=JSON.parse(readFileSync(new URL('./synthetic/installed-tentacle-multi-awaker.json',import.meta.url)));
const example=JSON.parse(readFileSync(new URL('../research/examples/theorycraft-installed-tentacle-team-bonuses.json',import.meta.url)));

test('ordered multi-Awakener Tentacle aggregation reproduces installed Lua outcomes',()=>{
  assert.equal(fixture.build,'pc-res151-build51');
  assert.equal(fixture.fixtures.length,346);
  for(const {input,expected} of fixture.fixtures){
    const aggregate=aggregateTentacleAwakerBonuses({build:fixture.build,awakers:input.awakers});
    const result=tentaclePreHit({build:fixture.build,isCrit:false,tentacleDamage:input.baseDamage,critDamagePer:input.tentacleCritDmg,
      beDamagePer:input.beDamagePer,beDamagePer2:input.beDamagePer2,beDamagePer3:input.beDamagePer3,
      beTentacleDamagePer:input.beTentacleDamagePer,vulnerablePer:input.vulnerablePer,beDamagePlus:input.beDamagePlus,
      ...aggregate.values,enemyStateMultiplier:aggregate.enemyStateMultiplier,paraPlus:input.paraPlus});
    assert.equal(result.preHitDamage,expected.preHitDamage);
  }
});

test('same state-property contributions sum across Awakeners; distinct properties multiply',()=>{
  const neutral={enemyTypePer:0,enemyBuffPer:0,enemyDebuffPer:0,enemyBlockPer:0,enemyBarrierPer:0,stateBonuses:{}};
  const first=aggregateTentacleAwakerBonuses({build:fixture.build,awakers:[{...neutral,enemyTypePer:100,stateBonuses:{state_a:20}},{...neutral,stateBonuses:{state_a:30,state_b:40}}]});
  assert.equal(first.values.enemyTypePer,50);
  assert.deepEqual(first.stateTotals,{state_a:50,state_b:40});
  assert.equal(first.enemyStateMultiplier,2.0999999999999996);
  assert.throws(()=>aggregateTentacleAwakerBonuses({build:fixture.build,awakers:[{...neutral,unknown:1}]}));
});

test('agent request exposes the team average and grouped state-product trace',()=>{
  const result=runTheorycraftRequest(example).result;
  assert.equal(result.values.enemyTypePer,15);
  assert.deepEqual(result.stateTotals,{state_a:50,state_b:40});
  assert.equal(result.enemyStateMultiplier,2.0999999999999996);
});
