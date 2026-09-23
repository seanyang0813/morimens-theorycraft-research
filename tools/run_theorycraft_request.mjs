import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runTheorycraftRequest,theorycraftOperations} from '../engine/theorycraft-api.mjs';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const args=process.argv.slice(2),options={};
for(let i=0;i<args.length;i+=2){if(!['--input','--output'].includes(args[i])||!args[i+1]){console.error('Usage: node tools/run_theorycraft_request.mjs --input request.json [--output response.json]');process.exit(2);}options[args[i]]=args[i+1];}
if(!options['--input']){console.error('Theorycraft request input is required');process.exit(2);}
const inside=(value,label)=>{const path=resolve(root,value),r=relative(root,path);if(!r||r.startsWith('..')||isAbsolute(r))throw new Error(`${label} must be inside the workspace`);return path;};
try{
  const request=JSON.parse(readFileSync(inside(options['--input'],'Input'),'utf8'));
  const requestedClientBuild=request.operation.startsWith('resolve-character-')?request.input?.build:request.operation==='assemble-wheel-loadout-properties'?request.input?.buildPlan?.clientBuild:request.operation==='compare-wheel-active-timelines'?(request.input?.baseline?.build??request.input?.candidate?.build):request.operation==='search-paid-wheel-orders'?request.input?.timeline?.build:(request.input?.clientBuild??request.input?.build);
  const selectedBuild=requestedClientBuild??'pc-res144-build51';
  if(!['pc-res144-build51','pc-res150-build51','pc-res151-build51'].includes(selectedBuild))throw new Error('Unsupported requested client build');
  const resource151Operations=new Set(['calculate-damage','calculate-player-tentacle-damage','calculate-tentacle-crit-damage','calculate-direct-tentacle-command','aggregate-tentacle-awaker-bonuses','calculate-snapshot-active-damage','run-snapshot-active-sequence','prepare-skill-command','run-prepared-snapshot-active-skill','run-ulti-energy-effect','run-card-resource-timeline','run-prepared-snapshot-block-skill','run-prepared-state-active-sequence','run-prepared-state-active-chain','run-paid-prepared-state-active-chain','validate-build-plan','resolve-character-primary','resolve-character-advancement-primary','assemble-build-components','advance-after-use-card-wheel-trigger','advance-after-keeper-skill-wheel-trigger','advance-after-pursuit-wheel-triggers','run-wheel-event-sequence','run-wheel-active-timeline','compare-wheel-active-timelines','run-paid-wheel-active-timeline','run-prepared-paid-wheel-active-timeline','search-paid-wheel-orders']);
  if(selectedBuild==='pc-res151-build51'&&!resource151Operations.has(request.operation))throw new Error('Requested operation is outside the proven resource-151 dependency scope');
  if(selectedBuild==='pc-res151-build51'&&request.operation==='calculate-damage'&&!['FIXED','PURE','TENTACLE'].includes(request.input?.damageType))throw new Error('Resource-151 resolved calculator support is limited to Fixed/Pure/Tentacle pre-hit effects');
  if(selectedBuild==='pc-res151-build51'&&request.operation==='prepare-skill-command'&&request.input?.execution!==null)throw new Error('Resource-151 prepared-skill support is preparation-only');
  if(selectedBuild==='pc-res151-build51'&&request.operation==='run-prepared-snapshot-active-skill'&&![1,4].includes(request.input?.schemaVersion))throw new Error('Resource-151 prepared snapshot support excludes ultimate-energy rows');
  const configRoot=selectedBuild==='pc-res151-build51'?'research/observations/current-res151-build51/modules':selectedBuild==='pc-res150-build51'?'research/observations/current-res150-build51/modules':'research/extracted/config';
  const readConfig=name=>{const bytes=readFileSync(resolve(root,`${configRoot}/${name}.json`));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
  const operation=theorycraftOperations.find(row=>row.name===request.operation);
  if(!operation)throw new Error('Unsupported theorycraft operation');
  const context={};
  if(operation.context.includes('buildCatalog'))context.buildCatalog=JSON.parse(readFileSync(resolve(root,'website/dist/build-catalog.json'),'utf8'));
  if(operation.context.includes('clientBuildData')){
    const clientDataFile=selectedBuild==='pc-res151-build51'?'client-build-data-res151.json':selectedBuild==='pc-res150-build51'?'client-build-data-res150.json':'client-build-data.json';
    context.clientBuildData=JSON.parse(readFileSync(resolve(root,`website/dist/${clientDataFile}`),'utf8'));
  }
  if(request.operation==='assemble-build-components'&&selectedBuild==='pc-res151-build51')context.wheelCurrentCompatibility=JSON.parse(readFileSync(resolve(root,'research/evidence/pc-res151-wheel-initial-state-compatibility.json'),'utf8'));
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
