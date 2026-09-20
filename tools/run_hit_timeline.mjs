import {readFileSync} from 'node:fs';
import {runResearchTimeline} from '../engine/research-timeline.mjs';
if(process.argv.length!==3){console.error('Usage: node tools/run_hit_timeline.mjs timeline.json');process.exitCode=2;}
else try{console.log(JSON.stringify(runResearchTimeline(JSON.parse(readFileSync(process.argv[2],'utf8'))),null,2));}
catch(error){console.error(error.message);process.exitCode=1;}
