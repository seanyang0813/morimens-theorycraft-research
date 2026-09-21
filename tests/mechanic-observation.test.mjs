import test from 'node:test';
import assert from 'node:assert/strict';
import {replayMechanicObservation} from '../tools/replay_mechanic_observation.mjs';

const record={
  kind:'REAL_GAME_OBSERVATION',
  mechanicRegression:{
    schemaVersion:1,
    model:'old-embers-active-statistics-v1',
    retrospective:true,
    holdout:false,
    observedCreditedDamage:6615,
    modelInput:{build:'pc-res144-build51',damageType:'ACTIVE',castDamage:2205,remainingStacks:680010,
      triggerEligible:true,hasState66314:false,hasState62317:false,targetHpIsZero:false,
      immueChangeHp:0,beChangeHpLimit:0},
  },
};

test('replays the bounded Old Embers statistics regression exactly',()=>{
  const result=replayMechanicObservation(record);
  assert.equal(result.predictedCreditedDamage,6615);
  assert.equal(result.observedCreditedDamage,6615);
  assert.equal(result.difference,0);
  assert.equal(result.exactMatch,true);
  assert.equal(result.triggerAmount,2205);
  assert.equal(result.stacksConsumed,2205);
});

test('rejects attempts to label the retrospective check a holdout',()=>{
  assert.throws(()=>replayMechanicObservation({...record,mechanicRegression:{...record.mechanicRegression,holdout:true}}),/retrospective non-holdout/);
});
