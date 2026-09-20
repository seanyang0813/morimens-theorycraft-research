// Human/agent CLI using the same comparison engine as the website.
import {readFileSync} from 'node:fs';
import {compareScenarios} from '../engine/experiments.mjs';
import {verifyRuntimeManifest} from './verify_runtime_manifest.mjs';
if(process.argv.length!==3){process.stderr.write('Usage: node tools/compare_experiment.mjs experiment.json\n');process.exitCode=2;}
else try{const experiment=JSON.parse(readFileSync(process.argv[2],'utf8'));const runtimeFingerprint=verifyRuntimeManifest();process.stdout.write(JSON.stringify(compareScenarios(experiment,{runtimeFingerprint}),null,2)+'\n');}
catch(error){process.stderr.write(error.message+'\n');process.exitCode=1;}
