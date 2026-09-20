import {readFileSync} from 'node:fs';
import {runDamageEnergyCommand} from '../engine/damage-energy-command.mjs';
if(process.argv.length!==3){console.error('Usage: node tools/run_damage_energy_command.mjs request.json');process.exitCode=2;}
else try{console.log(JSON.stringify(runDamageEnergyCommand(JSON.parse(readFileSync(process.argv[2],'utf8'))),null,2));}catch(error){console.error(error.message);process.exitCode=1;}
