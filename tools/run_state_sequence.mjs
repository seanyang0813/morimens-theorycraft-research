import {readFileSync} from 'node:fs';
import {runStateSequenceExperiment} from '../engine/state-sequence-experiment.mjs';
if(process.argv.length!==3){console.error('Usage: node tools/run_state_sequence.mjs input.json');process.exitCode=2;}
else try{console.log(JSON.stringify(runStateSequenceExperiment(JSON.parse(readFileSync(process.argv[2],'utf8'))),null,2));}
catch(error){console.error(error.message);process.exitCode=1;}
