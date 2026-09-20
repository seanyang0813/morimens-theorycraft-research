import {readFileSync} from 'node:fs';
import {resolvePrimaryStats} from '../engine/build-stats.mjs';
if(process.argv.length!==3){console.error('Usage: node tools/resolve_build_stats.mjs explicit-primary-stat-inputs.json');process.exitCode=2;}
else try{
  const catalog=JSON.parse(readFileSync(new URL('../website/dist/build-catalog.json',import.meta.url),'utf8'));
  const input=JSON.parse(readFileSync(process.argv[2],'utf8'));
  console.log(JSON.stringify(resolvePrimaryStats(input,catalog),null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
