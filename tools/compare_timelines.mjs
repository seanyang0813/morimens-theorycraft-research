import {readFileSync} from 'node:fs';
import {compareTimelines} from '../engine/timeline-experiments.mjs';
import {verifyRuntimeManifest} from './verify_runtime_manifest.mjs';
if(process.argv.length!==3){console.error('Usage: node tools/compare_timelines.mjs experiment.json');process.exitCode=2;}
else try{console.log(JSON.stringify(compareTimelines(JSON.parse(readFileSync(process.argv[2],'utf8')),{runtimeFingerprint:verifyRuntimeManifest()}),null,2));}
catch(error){console.error(error.message);process.exitCode=1;}
