import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {recalculateResolvedCombo} from '../engine/resolved-combo-modifiers.mjs';
const report=JSON.parse(readFileSync(new URL('../output/pdf/mouchette-approved-baseline-calculation.json',import.meta.url)));
const none={Mouchette:[],Arachne:[]};
const baseline=recalculateResolvedCombo(report,{teamDamageAmplificationPercent:0,wheelBonusesByOwner:none});
assert.equal(baseline.conditionalPreHitTotal,97228);assert.equal(baseline.finalDamage,null);
// Synthetic contrast checks factor placement, not the friend's unknown equipment.
const baseOnly=recalculateResolvedCombo(report,{teamDamageAmplificationPercent:100,wheelBonusesByOwner:none});
assert.equal(baseOnly.rounds[0].blast.showDamage,856); // ceil(78*1.35*2 + 645)
const inside=recalculateResolvedCombo(report,{teamDamageAmplificationPercent:0,wheelBonusesByOwner:{Mouchette:[{utilityProperty:'awakerInsideDamagePer',percent:100,evidence:'synthetic test only'}],Arachne:[]}});
assert.equal(inside.rounds[0].blast.showDamage,1501); // ceil((78*1.35 + 645)*2)
assert.equal(inside.rounds[0].strike.preHitDamage,1708);
assert.throws(()=>recalculateResolvedCombo(report,{teamDamageAmplificationPercent:0,wheelBonusesByOwner:{Mouchette:[{utilityProperty:'totalMultiplier',percent:100,evidence:'unknown Wheel'}],Arachne:[]}}),/supported/);
assert.throws(()=>recalculateResolvedCombo(report,{teamDamageAmplificationPercent:0,wheelBonusesByOwner:{Mouchette:[],Arachne:undefined}}),/list/);
