import {loadVerifiedRuntime} from './verified-runtime.mjs';
import {startStates} from './states.mjs';
try{
  const runtime=await loadVerifiedRuntime();startStates(runtime);
  document.getElementById('runtime-status').textContent='Engine integrity checked: '+runtime.runtimeFingerprint.slice(0,12)+'. This checks file consistency, not gameplay accuracy.';
  for(const id of ['run','example','swap'])document.getElementById(id).disabled=false;
}catch(error){document.getElementById('error').textContent='Engine verification failed: '+error.message;}
