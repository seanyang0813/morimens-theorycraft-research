import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveWheelRefinementParameters} from '../engine/wheel-refinement-parameters.mjs';
import {resolveWheelInitialProperties} from '../engine/wheel-initial-properties.mjs';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const args=process.argv.slice(2),options={};
for(let i=0;i<args.length;i+=2){if(!['--input','--output'].includes(args[i])||!args[i+1]){console.error('Usage: node tools/resolve_wheel_initial_properties.mjs --input request.json [--output response.json]');process.exit(2);}options[args[i]]=args[i+1];}
if(!options['--input']){console.error('Wheel initial-property request input is required');process.exit(2);}
const inside=(value,label)=>{const path=resolve(root,value),r=relative(root,path);if(!r||r.startsWith('..')||isAbsolute(r))throw new Error(`${label} must be inside the workspace`);return path;};
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
try{
  const request=JSON.parse(readFileSync(inside(options['--input'],'Input'),'utf8'));
  if(!exact(request,['schemaVersion','kind','requestId','wheelId','refinementLevel','ownerProperties'])||request.schemaVersion!==1||request.kind!=='morimens-wheel-initial-properties-request'||typeof request.requestId!=='string'||!request.requestId)throw new Error('Exact version 1 Wheel initial-property request required');
  const crosswalk=JSON.parse(readFileSync(resolve(root,'research/observations/wheel-config-audit/crosswalk-audit.json'),'utf8'));
  const states=JSON.parse(readFileSync(resolve(root,'research/extracted/config/State.json'),'utf8'));
  const row=crosswalk.rows.find(value=>value.wheelId===request.wheelId);
  if(!row||row.status!=='UNIQUE')throw new Error('Wheel requires a unique private client crosswalk');
  const candidate=row.candidates[0],parameterExpressions=Object.fromEntries(Object.entries(candidate.stateParameters??{}).map(([slot,expression])=>[`StateArg${slot}`,String(expression)]));
  const parameters=resolveWheelRefinementParameters({schemaVersion:1,kind:'morimens-wheel-refinement-parameters',build:'pc-res144-build51',wheelId:request.wheelId,refinementLevel:request.refinementLevel,parameters:parameterExpressions});
  const state=states[String(candidate.initialStateId)];
  if(!state)throw new Error('Crosswalked initial state is absent from the private state catalog');
  const properties=Object.entries(state.ExistProperty??{}).map(([property,expression])=>({property,expression:String(expression)}));
  if(properties.length<1)throw new Error('Crosswalked initial state has no direct properties');
  const calculation=resolveWheelInitialProperties({schemaVersion:1,kind:'morimens-wheel-initial-properties',build:'pc-res144-build51',wheelId:request.wheelId,stateArgs:parameters.values,ownerProperties:request.ownerProperties,properties});
  const response={schemaVersion:1,kind:'morimens-wheel-initial-properties-response',analysisTrack:'mechanics',requestId:request.requestId,status:calculation.status,wheel:{id:row.wheelId,name:row.wheelName,crosswalkStatus:row.status},initialState:{id:candidate.initialStateId,target:candidate.stateTarget},refinementLevel:request.refinementLevel,stateArgs:parameters.values,ownerProperties:request.ownerProperties,propertyContributions:calculation.contributions.map(({expression,reads,calls,rounding,...item})=>({...item,readNames:reads.map(value=>value.name),functionNames:calls.map(value=>value.name),rounding:{base:rounding.base,rounded:rounding.rounded}})),source:{publicCrosswalkAudit:'research/evidence/wheel-state-crosswalk-audit.json',publicRefinementAudit:'research/evidence/wheel-refinement-runtime-audit.json',privateClientStateExportSha256:crosswalk.source.privateClientStateExportSha256},finalDamage:null,limitations:calculation.limitations};
  const output=JSON.stringify(response,null,2)+'\n';if(options['--output'])writeFileSync(inside(options['--output'],'Output'),output,{encoding:'utf8',flag:'wx'});else process.stdout.write(output);
}catch(error){process.stderr.write(JSON.stringify({schemaVersion:1,kind:'morimens-wheel-initial-properties-error',analysisTrack:'mechanics',status:'ERROR',message:error.message},null,2)+'\n');process.exitCode=1;}
