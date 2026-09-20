// Recompute a named experimental metric; this never grants gameplay validation.
import {readFileSync} from 'node:fs';
import {runObservationScenario} from '../engine/observation-scenario.mjs';
import {verifyRuntimeManifest} from './verify_runtime_manifest.mjs';
try{
  const [path,metric,expectedFingerprint]=process.argv.slice(2);
  if(process.argv.length!==5||!['preHitDamage','modeledHpLost'].includes(metric))throw new Error('Explicit scenario, supported metric and runtime fingerprint required');
  const runtimeFingerprint=verifyRuntimeManifest();
  if(runtimeFingerprint!==expectedFingerprint)throw new Error('Observation runtime fingerprint mismatch');
  const scenario=JSON.parse(readFileSync(path,'utf8'));
  console.log(JSON.stringify({...runObservationScenario(scenario,metric),runtimeFingerprint}));
}catch(error){console.error(error.message);process.exitCode=1;}
