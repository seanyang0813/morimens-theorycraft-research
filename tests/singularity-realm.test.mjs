import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {singularityLayers,applySingularityToCombo,resolveFinalRealmMastery} from '../engine/singularity-realm.mjs';
const report=JSON.parse(readFileSync(new URL('../output/pdf/mouchette-equipped-baseline-calculation.json',import.meta.url)));
assert.deepEqual(singularityLayers(0),{prism:15,beacon:25});
assert.deepEqual(singularityLayers(72),{prism:16,beacon:26});
assert.deepEqual(singularityLayers(144),{prism:17,beacon:27});
// Synthetic property vectors, not claims about the user's starting team stats.
assert.deepEqual(resolveFinalRealmMastery({occupationMaster:72,finalMasteryPercent:100}),{occupationMaster:72,finalMasteryPercent:100,finalRealmMastery:144,prism:17,beacon:27});
assert.equal(resolveFinalRealmMastery({occupationMaster:72.1,finalMasteryPercent:0}).finalRealmMastery,73);
assert.equal(resolveFinalRealmMastery({occupationMaster:72.1,finalMasteryPercent:100}).finalRealmMastery,145);
assert.throws(()=>resolveFinalRealmMastery({occupationMaster:72}),/Explicit/);
assert.throws(()=>resolveFinalRealmMastery({occupationMaster:Infinity,finalMasteryPercent:0}),/Explicit/);
const zero=Array(10).fill(0),schedule=[25,...Array(9).fill(0)];
const result=applySingularityToCombo(report,{finalRealmMastery:0,beaconLayersByPlayedCard:schedule});
assert.equal(result.rounds[0].aHit.showDamage,1332); // 739.5*(1+.30+.50)
assert.equal(result.rounds[1].aHit.showDamage,962); // no inherited Beacon
assert.equal(result.rounds[0].blast.showDamage,1266); // 973.25*1.30
assert.equal(result.rounds[0].pursuit.showDamage,1556); // 1196.2*1.30
assert.equal(result.finalDamage,null);
assert.throws(()=>applySingularityToCombo(report,{finalRealmMastery:0,beaconLayersByPlayedCard:[]}),/schedule/);
assert.throws(()=>singularityLayers(-1),/Mastery/);
const missing=[...zero];delete missing[3];
assert.throws(()=>applySingularityToCombo(report,{finalRealmMastery:0,beaconLayersByPlayedCard:missing}),/dense/);
