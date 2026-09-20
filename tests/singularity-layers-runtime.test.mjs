import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {singularityLayers} from '../engine/singularity-realm.mjs';
const fixture=JSON.parse(readFileSync(new URL('./synthetic/original-singularity-layers.json',import.meta.url)));
for(const {finalRealmMastery,expected} of fixture.fixtures){
  assert.equal(expected.prismStateId,133368);
  assert.equal(expected.beaconStateId,134389);
  assert.deepEqual(singularityLayers(finalRealmMastery),{prism:expected.prism,beacon:expected.beacon},`mastery ${finalRealmMastery}`);
}
console.log(`Passed ${fixture.fixtures.length} original-runtime realm layer cases`);
