import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync('research/evidence/pc-res151-wheel-timeline-compatibility.json','utf8'));

test('resource 151 Wheel timeline binds unchanged rows to Active and payment boundaries',()=>{
  assert.equal(report.kind,'MORIMENS_PC_WHEEL_TIMELINE_COMPATIBILITY');assert.equal(report.build,'pc-res151-build51');
  assert.equal(report.status,'SUPPORTED_BY_EXACT_CATALOG_AND_COMPONENT_CARRYFORWARD');assert.equal(report.operations.length,9);
  assert.deepEqual(report.composedEvidence,{wheelStateRows:9,wheelCommandRows:4,catalogSemanticChanges:0,activeClientModuleDependencies:6,activeConfigDependencies:5,ordinaryPveCardPlayFixtures:90,energyPaymentFixtures:222});
  assert.equal(report.buildSpecificRule.doomsdayOwnerAttackSourceProperty,'AtkForce');
  assert.ok(report.limitations.some(value=>value.includes('No connected trigger scheduling')));
});
