import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runTheorycraftRequest} from '../engine/theorycraft-api.mjs';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const args=process.argv.slice(2),options={};
for(let i=0;i<args.length;i+=2){if(!['--input','--output'].includes(args[i])||!args[i+1]){console.error('Usage: node tools/run_theorycraft_request.mjs --input request.json [--output response.json]');process.exit(2);}options[args[i]]=args[i+1];}
if(!options['--input']){console.error('Theorycraft request input is required');process.exit(2);}
const inside=(value,label)=>{const path=resolve(root,value),r=relative(root,path);if(!r||r.startsWith('..')||isAbsolute(r))throw new Error(`${label} must be inside the workspace`);return path;};
try{
  const request=JSON.parse(readFileSync(inside(options['--input'],'Input'),'utf8'));
  const requestedClientBuild=request.operation.startsWith('resolve-character-')?request.input?.build:request.operation==='assemble-wheel-loadout-properties'?request.input?.buildPlan?.clientBuild:(request.input?.clientBuild??request.input?.build);
  const selectedBuild=requestedClientBuild??'pc-res144-build51';
  if(!['pc-res144-build51','pc-res150-build51'].includes(selectedBuild))throw new Error('Unsupported requested client build');
  const configRoot=selectedBuild==='pc-res150-build51'?'research/observations/current-res150-build51/modules':'research/extracted/config';
  const readConfig=name=>{const bytes=readFileSync(resolve(root,`${configRoot}/${name}.json`));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
  const clientDataFile=requestedClientBuild==='pc-res150-build51'?'client-build-data-res150.json':'client-build-data.json';
  const context={
    buildCatalog:JSON.parse(readFileSync(resolve(root,'website/dist/build-catalog.json'),'utf8')),
    clientBuildData:JSON.parse(readFileSync(resolve(root,`website/dist/${clientDataFile}`),'utf8')),
  };
  if(['prepare-skill-command','run-prepared-snapshot-active-skill','run-prepared-snapshot-block-skill','run-prepared-state-active-sequence','run-prepared-state-active-chain','run-paid-prepared-state-active-chain','run-prepared-paid-wheel-active-timeline','run-attached-card-pipeline','run-prepared-mortal-blast'].includes(request.operation)){
    const skill=readConfig('Skill'),battleApi=readConfig('BattleApi'),command=readConfig('Cmd'),state=readConfig('State');
    context.skillCommandData={build:selectedBuild,skills:skill.data,battleApi:battleApi.data,commands:command.data,states:state.data,sourceHashes:{Skill:skill.sha256,BattleApi:battleApi.sha256,Cmd:command.sha256,State:state.sha256}};
  }
  if(request.operation==='assemble-wheel-loadout-properties'){
    if(selectedBuild!=='pc-res144-build51')throw new Error('Wheel loadout-property assembly currently requires pc-res144-build51');
    const crosswalkBytes=readFileSync(resolve(root,'research/observations/wheel-config-audit/crosswalk-audit.json')),crosswalk=JSON.parse(crosswalkBytes),state=readConfig('State');
    context.wheelMechanicsData={build:selectedBuild,crosswalkRows:crosswalk.rows,states:state.data,sourceHashes:{crosswalk:createHash('sha256').update(crosswalkBytes).digest('hex'),State:state.sha256}};
  }
  const response=runTheorycraftRequest(request,context),text=JSON.stringify(response,null,2)+'\n';
  if(options['--output'])writeFileSync(inside(options['--output'],'Output'),text,{encoding:'utf8',flag:'wx'});else process.stdout.write(text);
}catch(error){
  const failure={schemaVersion:1,kind:'morimens-theorycraft-error',status:'ERROR',message:error.message};
  process.stderr.write(JSON.stringify(failure,null,2)+'\n');process.exitCode=1;
}
