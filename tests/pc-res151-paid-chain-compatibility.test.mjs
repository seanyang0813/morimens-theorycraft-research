import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const report=JSON.parse(readFileSync('research/evidence/pc-res151-paid-state-active-chain-compatibility.json','utf8'));

test('resource 151 paid state-to-Active support binds all legality, payment and effect dependencies',()=>{
  assert.equal(report.kind,'MORIMENS_PC_PAID_STATE_ACTIVE_CHAIN_COMPATIBILITY');assert.equal(report.build,'pc-res151-build51');
  assert.equal(report.status,'SUPPORTED_BY_EXACT_DEPENDENCY_CARRYFORWARD_AND_COMPOSITION');
  assert.deepEqual(report.operations,['run-card-resource-timeline','run-paid-prepared-state-active-chain']);
  assert.equal(report.modules.length,7);assert.ok(report.modules.every(row=>row.status==='IDENTICAL'&&row.resource150Sha256===row.resource151Sha256));
  assert.deepEqual(report.composedEvidence,{ordinaryPveCardPlayFixtures:90,ordinaryPveCardPlayMismatches:0,energyPaymentFixtures:222,energyPaymentMismatches:0,stateMutationFixtures:432,supportedActiveSchemas:[1,4]});
  for(const row of report.modules)assert.equal(row.resource151Sha256,sha(readFileSync(`research/observations/current-res151-build51/modules/${row.name}`)));
  assert.ok(report.limitations.some(value=>value.includes('No gameplay, prediction or holdout credit')));
});
