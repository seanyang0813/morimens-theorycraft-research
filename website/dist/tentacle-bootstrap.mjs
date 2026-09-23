import {loadVerifiedRuntime} from './verified-runtime.mjs';
import {startDirectTentacleCalculator} from './tentacle.mjs';
try{startDirectTentacleCalculator(await loadVerifiedRuntime());}catch(error){document.getElementById('runtime-status').textContent='Runtime verification failed';document.getElementById('error').textContent=error.message;}
