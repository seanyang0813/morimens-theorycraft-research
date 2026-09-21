import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {isAbsolute,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runObservationScenario} from '../engine/observation-scenario.mjs';
import {verifyRuntimeManifest} from './verify_runtime_manifest.mjs';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const observationRoot=resolve(root,'research/observations');
const publicHoldoutRoot=resolve(root,'research/evidence/holdouts');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const relativePath=path=>relative(root,path).replaceAll('\\','/');
function insideRoot(value,label){
  const path=resolve(root,value),rel=relative(root,path);
  if(!rel||rel.startsWith('..')||isAbsolute(rel))throw new Error(`${label} must be a file inside the research workspace`);
  return path;
}
function readExisting(value,label){
  const path=insideRoot(value,label);
  if(!existsSync(path))throw new Error(`${label} does not exist`);
  return {path,bytes:readFileSync(path)};
}

export function freezeGameplayPrediction({scenarioFile,metric,evidenceFiles,outputFile,recordedCombatBuild=null,buildEvidenceFiles=[],now=()=>new Date()}){
  if(!['preHitDamage','modeledHpLost'].includes(metric))throw new Error('Metric must be preHitDamage or modeledHpLost');
  if(!Array.isArray(evidenceFiles)||evidenceFiles.length===0||evidenceFiles.some(value=>typeof value!=='string'||!value))throw new Error('At least one pre-outcome evidence file is required');
  if(!Array.isArray(buildEvidenceFiles)||buildEvidenceFiles.some(value=>typeof value!=='string'||!value))throw new Error('Build evidence must be a list of files');
  const hasBuild=typeof recordedCombatBuild==='string'&&recordedCombatBuild.length>0&&recordedCombatBuild.length<=128;
  if((recordedCombatBuild!==null&&!hasBuild)||(hasBuild!==Boolean(buildEvidenceFiles.length)))throw new Error('Recorded combat build and at least one build-evidence file must be supplied together');
  const scenario=readExisting(scenarioFile,'Scenario');
  const evidence=evidenceFiles.map(value=>readExisting(value,'Pre-outcome evidence'));
  const buildEvidence=buildEvidenceFiles.map(value=>readExisting(value,'Build evidence'));
  if(evidence.some(item=>item.path===scenario.path))throw new Error('Pre-outcome evidence must be separate from the scenario');
  if(buildEvidence.some(item=>item.path===scenario.path))throw new Error('Build evidence must be separate from the scenario');
  const output=insideRoot(outputFile,'Output');
  const allowed=[observationRoot,publicHoldoutRoot].some(base=>{const item=relative(base,output);return item&&!item.startsWith('..')&&!isAbsolute(item);});
  if(!allowed)throw new Error('Output must be inside research/observations or research/evidence/holdouts');
  if(existsSync(output))throw new Error('Prediction freeze already exists; refusing to overwrite chronology evidence');
  const input=JSON.parse(scenario.bytes.toString('utf8'));
  const runtimeFingerprint=verifyRuntimeManifest(),result=runObservationScenario(input,metric);
  const prediction={scenarioFile:relativePath(scenario.path),scenarioSha256:hash(scenario.bytes),runtimeFingerprint,metric};
  const record={schemaVersion:1,kind:'MORIMENS_PREDICTION_FREEZE',createdAtUtc:now().toISOString(),prediction,predictedDamage:result.value,predictionScope:result.scope,scenarioKind:result.scenarioKind,
    unresolvedDependencies:result.unresolvedDependencies,beforeOutcomeEvidence:evidence.map(item=>({path:relativePath(item.path),sha256:hash(item.bytes)})),
    recordedBuild:hasBuild?{id:recordedCombatBuild,evidence:buildEvidence.map(item=>({path:relativePath(item.path),sha256:hash(item.bytes)}))}:null};
  writeFileSync(output,JSON.stringify(record,null,2)+'\n',{encoding:'utf8',flag:'wx'});
  const outputBytes=readFileSync(output);
  return {path:relativePath(output),sha256:hash(outputBytes),prediction,predictedDamage:record.predictedDamage};
}

function parseArgs(args){
  const parsed={evidenceFiles:[],buildEvidenceFiles:[]};
  for(let i=0;i<args.length;i++){
    const flag=args[i],value=args[++i];
    if(!value||!['--scenario','--metric','--evidence','--output','--recorded-build','--build-evidence'].includes(flag))throw new Error('Usage: node tools/freeze_gameplay_prediction.mjs --scenario <file> --metric <preHitDamage|modeledHpLost> --evidence <pre-outcome-file> [--recorded-build BUILD --build-evidence <file> ...] --output <research/observations/...json>');
    if(flag==='--evidence')parsed.evidenceFiles.push(value);
    else if(flag==='--build-evidence')parsed.buildEvidenceFiles.push(value);
    else if(flag==='--recorded-build')parsed.recordedCombatBuild=value;
    else if(flag==='--scenario')parsed.scenarioFile=value;
    else if(flag==='--metric')parsed.metric=value;
    else parsed.outputFile=value;
  }
  if(!parsed.scenarioFile||!parsed.metric||!parsed.outputFile)throw new Error('Scenario, metric, evidence and output are required');
  return parsed;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify(freezeGameplayPrediction(parseArgs(process.argv.slice(2))),null,2));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
