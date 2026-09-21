import {readFileSync} from 'node:fs';
import {runCreateCardCommand} from '../engine/create-card-command.mjs';

if(process.argv.length!==3){console.error('Usage: node tools/run_create_card_command.mjs request.json');process.exitCode=2;}
else try{console.log(JSON.stringify(runCreateCardCommand(JSON.parse(readFileSync(process.argv[2],'utf8'))),null,2));}
catch(error){console.error(error.message);process.exitCode=1;}
