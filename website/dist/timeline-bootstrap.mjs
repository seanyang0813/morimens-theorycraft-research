import {loadVerifiedRuntime} from './verified-runtime.mjs';
import {startTimeline} from './timeline.mjs';
const ids=['run','pin','example','embers-example','load-comparison'];
for(const id of ids)document.getElementById(id).disabled=true;
try{
  const runtime=await loadVerifiedRuntime();startTimeline(runtime);
  document.getElementById('runtime-status').textContent='Verified engine snapshot: '+runtime.runtimeFingerprint.slice(0,12)+'. Comparisons save its full fingerprint.';
  for(const id of ids)document.getElementById(id).disabled=false;
}catch(error){document.getElementById('error').textContent='Engine verification failed: '+error.message;}
