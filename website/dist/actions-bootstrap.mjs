import {loadVerifiedRuntime} from './verified-runtime.mjs';
import {startActions} from './actions.mjs';
try{
  const runtime=await loadVerifiedRuntime();startActions(runtime);
  document.getElementById('runtime-status').textContent='Verified engine snapshot: '+runtime.runtimeFingerprint.slice(0,12)+'. Full fingerprint accompanies the result trace.';
  for(const id of ['run','example','mixed-example','reverse'])document.getElementById(id).disabled=false;
}catch(error){document.getElementById('error').textContent='Engine verification failed: '+error.message;}
