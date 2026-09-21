import {loadVerifiedRuntime} from './verified-runtime.mjs';
import {startSnapshotCalculator} from './snapshot.mjs';
try{startSnapshotCalculator(await loadVerifiedRuntime());}catch(error){document.getElementById('runtime-status').textContent='Runtime verification failed';document.getElementById('error').textContent=error.message;}
