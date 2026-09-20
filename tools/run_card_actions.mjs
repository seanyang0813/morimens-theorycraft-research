import {readFileSync} from 'node:fs';
import {runCardActionTimeline} from '../engine/card-action-timeline.mjs';
if(process.argv.length!==3){console.error('Usage: node tools/run_card_actions.mjs actions.json');process.exitCode=2;}
else try{console.log(JSON.stringify(runCardActionTimeline(JSON.parse(readFileSync(process.argv[2],'utf8'))),null,2));}
catch(error){console.error(error.message);process.exitCode=1;}
