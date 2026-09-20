import {readFileSync} from 'node:fs';
import {runOldEmbersHitTimeline} from '../engine/old-embers-hit-timeline.mjs';
if(process.argv.length!==3){console.error('Usage: node tools/run_old_embers_timeline.mjs timeline.json');process.exitCode=2;}
else try{console.log(JSON.stringify(runOldEmbersHitTimeline(JSON.parse(readFileSync(process.argv[2],'utf8'))),null,2));}
catch(error){console.error(error.message);process.exitCode=1;}
