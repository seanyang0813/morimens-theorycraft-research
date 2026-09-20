import {readFileSync} from 'node:fs';
import {runUltiEnergyExperiment} from '../engine/ulti-energy-experiment.mjs';
if(process.argv.length!==3){console.error('Usage: node tools/run_ulti_energy.mjs request.json');process.exitCode=2;}
else try{console.log(JSON.stringify(runUltiEnergyExperiment(JSON.parse(readFileSync(process.argv[2],'utf8'))),null,2));}catch(error){console.error(error.message);process.exitCode=1;}
