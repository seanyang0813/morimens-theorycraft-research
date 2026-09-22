// Recompute a named experimental metric; this never grants gameplay validation.
import {readFileSync} from 'node:fs';
import {runObservationScenario} from '../engine/observation-scenario.mjs';
import {verifyObservationRuntimeContract,verifyRuntimeManifest} from './verify_runtime_manifest.mjs';
import {loadSkillCommandData} from './load_skill_command_data.mjs';
try{
  const [path,metric,expectedFingerprint,contractJson]=process.argv.slice(2);
  if(![5,6].includes(process.argv.length)||!['preHitDamage','modeledHpLost'].includes(metric))throw new Error('Explicit scenario, supported metric and runtime fingerprint required');
  const scenario=JSON.parse(readFileSync(path,'utf8'));
  let runtime;
  if(contractJson){
    const contract=JSON.parse(contractJson);
    if(contract.fullRuntimeFingerprint!==expectedFingerprint)throw new Error('Observation runtime fingerprint and contract differ');
    runtime=verifyObservationRuntimeContract(scenario,contract);
  }else{
    const runtimeFingerprint=verifyRuntimeManifest();
    if(runtimeFingerprint!==expectedFingerprint)throw new Error('Observation runtime fingerprint mismatch');
    runtime={frozenRuntimeFingerprint:expectedFingerprint,currentRuntimeFingerprint:runtimeFingerprint,runtimeContractFingerprint:null};
  }
  const context=scenario?.kind==='morimens-theorycraft-request'?{skillCommandData:loadSkillCommandData(scenario.input?.build)}:{};
  console.log(JSON.stringify({...runObservationScenario(scenario,metric,context),runtimeFingerprint:runtime.frozenRuntimeFingerprint,...runtime}));
}catch(error){console.error(error.message);process.exitCode=1;}
