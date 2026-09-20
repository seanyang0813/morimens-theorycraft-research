import {readFileSync} from 'node:fs';
import {resolvePveCardResources} from '../engine/card-use-resources.mjs';
if(process.argv.length!==3){console.error('Usage: node tools/resolve_card_resources.mjs inputs.json');process.exitCode=2;}
else try{console.log(JSON.stringify(resolvePveCardResources(JSON.parse(readFileSync(process.argv[2],'utf8'))),null,2));}
catch(error){console.error(error.message);process.exitCode=1;}
