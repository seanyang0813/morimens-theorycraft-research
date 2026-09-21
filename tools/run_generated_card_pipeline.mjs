import {readFileSync} from 'node:fs';
import {runGeneratedCardPipeline} from '../engine/generated-card-pipeline.mjs';

if(process.argv.length!==3){console.error('Usage: node tools/run_generated_card_pipeline.mjs request.json');process.exitCode=2;}
else try{console.log(JSON.stringify(runGeneratedCardPipeline(JSON.parse(readFileSync(process.argv[2],'utf8'))),null,2));}
catch(error){console.error(error.message);process.exitCode=1;}
