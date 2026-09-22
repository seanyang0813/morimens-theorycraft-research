import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync(new URL('../research/evidence/wheel-replay-state-audit.json',import.meta.url)));
test('serialized replay Wheel states match the bounded resolver and retain observed fractions',()=>{
  assert.equal(report.analysisTrack,'verification');
  assert.equal(report.status,'RETROSPECTIVE_SERIALIZED_BATTLE_MATCH');
  assert.deepEqual(report.summary,{replays:102,weaponStateSnapshots:812,uniquelyCrosswalkedSnapshots:793,unresolvedCrosswalkSnapshots:19,stateIdentityMatches:793,stateIdentityMismatches:0,embeddedPropertyDefinitionMatches:793,embeddedPropertyDefinitionMismatches:0,refinementParameterMatches:793,refinementParameterMismatches:0,directPropertySnapshots:412,emptyDirectPropertySnapshots:381,serializedRawPropertyMatches:793,serializedRawPropertyMismatches:0,clientInitAndSerializedValueMatches:788,clientInitAndSerializedValueDifferences:5,distinctWheelsCovered:108,distinctUnresolvedPrivateItemRows:3});
  assert.deepEqual(report.refinementLevelHistogram,{0:1,1:1,2:2,3:789});
  assert.deepEqual(report.awakenerCountHistogram,{4:102});
  assert.deepEqual(report.weaponStateCountHistogram,{6:2,8:100});
  assert.deepEqual(report.weaponStatesPerAwakenerHistogram,{0:1,1:2,2:405});
  assert.equal(report.identifiersPublished,false);
  assert.ok(report.limitations.some(value=>value.includes('independent holdout')));
});
