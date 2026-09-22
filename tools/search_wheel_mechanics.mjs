import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {searchWheelMechanics} from '../engine/wheel-mechanics-search.mjs';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const args=process.argv.slice(2),options={};
for(let i=0;i<args.length;i+=2){if(!['--input','--output'].includes(args[i])||!args[i+1]){console.error('Usage: node tools/search_wheel_mechanics.mjs --input request.json [--output response.json]');process.exit(2);}options[args[i]]=args[i+1];}
if(!options['--input']){console.error('Wheel mechanics search input is required');process.exit(2);}
const inside=(value,label)=>{const path=resolve(root,value),r=relative(root,path);if(!r||r.startsWith('..')||isAbsolute(r))throw new Error(`${label} must be inside the workspace`);return path;};
try{
  const input=JSON.parse(readFileSync(inside(options['--input'],'Input'),'utf8'));
  const catalog=JSON.parse(readFileSync(resolve(root,'research/evidence/wheel-mechanics-capability-catalog.json'),'utf8'));
  const response=searchWheelMechanics(input,catalog),text=JSON.stringify(response,null,2)+'\n';
  if(options['--output'])writeFileSync(inside(options['--output'],'Output'),text,{encoding:'utf8',flag:'wx'});else process.stdout.write(text);
}catch(error){
  process.stderr.write(JSON.stringify({schemaVersion:1,kind:'morimens-wheel-mechanics-search-error',analysisTrack:'mechanics',status:'ERROR',message:error.message},null,2)+'\n');process.exitCode=1;
}
