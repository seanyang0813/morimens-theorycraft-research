import test from 'node:test';
import assert from 'node:assert/strict';
import {createObservationRuntimeContract,verifyObservationRuntimeContract} from '../tools/verify_runtime_manifest.mjs';

const scenario={build:'pc-res144-build51',mode:'experimental',damageType:'FIXED',effect:{build:'pc-res144-build51',category:'FIXED',targetDead:false,baseDamage:100,dimensionFixPer:0,fixed1:0,fixed2:0,fixed3:0,fixed4:0,fixed5:0}};

test('observation runtime contract pins only the selected prediction dependency graph',()=>{
  const contract=createObservationRuntimeContract(scenario),verified=verifyObservationRuntimeContract(scenario,contract);
  assert.equal(verified.frozenRuntimeFingerprint,contract.fullRuntimeFingerprint);
  assert.ok(contract.files['engine/observation-scenario.mjs']);
  assert.ok(contract.files['engine/calculate-damage.mjs']);
  assert.equal(contract.files['engine/legal-card-actions.mjs'],undefined);
  assert.throws(()=>verifyObservationRuntimeContract(scenario,{...contract,fingerprint:'0'.repeat(64)}),/fingerprint mismatch/);
  assert.throws(()=>verifyObservationRuntimeContract({...scenario,kind:'morimens-card-action-timeline',mode:undefined},{...contract}),/scope mismatch/);
});
