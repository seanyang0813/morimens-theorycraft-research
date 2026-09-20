// Recompute a named experimental metric; this never grants gameplay validation.
import {readFileSync} from 'node:fs';
import {calculateDamage} from '../engine/calculate-damage.mjs';
import {verifyRuntimeManifest} from './verify_runtime_manifest.mjs';
try{
  const [path,metric,expectedFingerprint]=process.argv.slice(2);
  if(process.argv.length!==5||!['preHitDamage','modeledHpLost'].includes(metric))throw new Error('Explicit scenario, supported metric and runtime fingerprint required');
  const runtimeFingerprint=verifyRuntimeManifest();
  if(runtimeFingerprint!==expectedFingerprint)throw new Error('Observation runtime fingerprint mismatch');
  const scenario=JSON.parse(readFileSync(path,'utf8'));
  if(scenario.mode!=='experimental')throw new Error('Explicit experimental scenario required');
  const result=calculateDamage(scenario);
  const models=result.experimentalModels.filter(m=>Object.hasOwn(m,metric));
  if(models.length!==1||!Number.isFinite(models[0][metric]))throw new Error('Requested metric is unavailable or ambiguous');
  console.log(JSON.stringify({build:scenario.build,runtimeFingerprint,metric,value:models[0][metric],scope:models[0].scope,unresolvedDependencies:result.unresolvedDependencies}));
}catch(error){console.error(error.message);process.exitCode=1;}
