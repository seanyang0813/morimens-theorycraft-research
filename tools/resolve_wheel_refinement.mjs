import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveWheelRefinementParameters} from '../engine/wheel-refinement-parameters.mjs';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const args=process.argv.slice(2),options={};
for(let i=0;i<args.length;i+=2){if(!['--input','--output'].includes(args[i])||!args[i+1]){console.error('Usage: node tools/resolve_wheel_refinement.mjs --input request.json [--output response.json]');process.exit(2);}options[args[i]]=args[i+1];}
if(!options['--input']){console.error('Wheel refinement request input is required');process.exit(2);}
const inside=(value,label)=>{const path=resolve(root,value),r=relative(root,path);if(!r||r.startsWith('..')||isAbsolute(r))throw new Error(`${label} must be inside the workspace`);return path;};
try{
  const request=JSON.parse(readFileSync(inside(options['--input'],'Input'),'utf8'));
  if(!request||Object.keys(request).sort().join(',')!=='kind,refinementLevel,requestId,schemaVersion,wheelId'||request.schemaVersion!==1||request.kind!=='morimens-wheel-refinement-request'||typeof request.requestId!=='string'||!request.requestId)throw new Error('Exact version 1 Wheel refinement request required');
  const crosswalk=JSON.parse(readFileSync(resolve(root,'research/observations/wheel-config-audit/crosswalk-audit.json'),'utf8'));
  const row=crosswalk.rows.find(value=>value.wheelId===request.wheelId);
  if(!row||row.status!=='UNIQUE')throw new Error('Wheel requires a unique private client crosswalk');
  const candidate=row.candidates[0],parameters=Object.fromEntries(Object.entries(candidate.stateParameters??{}).map(([slot,expression])=>[`StateArg${slot}`,String(expression)]));
  const calculation=resolveWheelRefinementParameters({schemaVersion:1,kind:'morimens-wheel-refinement-parameters',build:'pc-res144-build51',wheelId:request.wheelId,refinementLevel:request.refinementLevel,parameters});
  const response={schemaVersion:1,kind:'morimens-wheel-refinement-response',analysisTrack:'mechanics',requestId:request.requestId,status:calculation.status,wheel:{id:row.wheelId,name:row.wheelName,crosswalkStatus:row.status},initialState:{id:candidate.initialStateId,target:candidate.stateTarget},refinementLevel:request.refinementLevel,stateArgs:calculation.values,trace:calculation.trace.map(({expression,...item})=>item),source:{publicRuntimeAudit:'research/evidence/wheel-refinement-runtime-audit.json',privateCrosswalkSha256:crosswalk.source.privateClientItemExportSha256},limitations:calculation.limitations};
  const text=JSON.stringify(response,null,2)+'\n';if(options['--output'])writeFileSync(inside(options['--output'],'Output'),text,{encoding:'utf8',flag:'wx'});else process.stdout.write(text);
}catch(error){process.stderr.write(JSON.stringify({schemaVersion:1,kind:'morimens-wheel-refinement-error',analysisTrack:'mechanics',status:'ERROR',message:error.message},null,2)+'\n');process.exitCode=1;}
