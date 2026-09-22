import {loadVerifiedRuntime} from './verified-runtime.mjs';
import {startWheelEventLab} from './wheel-events.mjs';
try{startWheelEventLab(await loadVerifiedRuntime());}catch(error){document.getElementById('runtime-status').textContent='Engine verification failed';document.getElementById('error').textContent=error.message;}
