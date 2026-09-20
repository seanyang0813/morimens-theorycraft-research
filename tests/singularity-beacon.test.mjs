import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {beforePlayedCardBeacon,afterPlayedCardShuttle} from '../engine/singularity-beacon.mjs';
const data=JSON.parse(readFileSync(new URL('./synthetic/original-singularity-beacon.json',import.meta.url)));
for(const row of data.fixtures)assert.deepEqual(beforePlayedCardBeacon(row.input),row.expected,`skill ${row.skillId}, states ${JSON.stringify(row.input)}`);
assert.throws(()=>beforePlayedCardBeacon({cardTypes:[],finalRealmMastery:0}),/state counts/);
// Code-derived counter composition, separate from original expression fixtures.
let counters={shuttleUses:0,extraShuttles:0};
const sequence=[122485,122486,126484,122483,126484,122483];
const flags=[];
for(const skillId of sequence){
  const reference=data.fixtures.find(row=>row.skillId===skillId).input;
  const before=beforePlayedCardBeacon({...reference,...counters});
  flags.push(before.temporaryBeaconLayers);
  counters=afterPlayedCardShuttle({...counters,admissionMarker:before.admissionMarker,isDimensionBout:false});
}
assert.deepEqual(flags,[0,0,26,0,0,0]);
assert.equal(counters.shuttleUses,1);
assert.deepEqual(afterPlayedCardShuttle({admissionMarker:true,isDimensionBout:false,shuttleUses:0,extraShuttles:2}),{copiesToDimension:true,shuttleUses:1,extraShuttles:2});
assert.deepEqual(afterPlayedCardShuttle({admissionMarker:true,isDimensionBout:false,shuttleUses:1,extraShuttles:2}),{copiesToDimension:true,shuttleUses:2,extraShuttles:1});
assert.deepEqual(afterPlayedCardShuttle({admissionMarker:true,isDimensionBout:true,shuttleUses:1,extraShuttles:2}),{copiesToDimension:false,shuttleUses:1,extraShuttles:2});
console.log(`Passed ${data.fixtures.length} original-runtime Beacon eligibility cases`);
