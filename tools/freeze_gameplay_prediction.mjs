import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {isAbsolute,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {calculateDamage} from '../engine/calculate-damage.mjs';
import {verifyRuntimeManifest} from './verify_runtime_manifest.mjs';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const observationRoot=resolve(root,'research/observations');
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

export function freezeGameplayPrediction({scenarioFile,metric,evidenceFiles,outputFile,now=()=>new Date()}){
  if(!['preHitDamage','modeledHpLost'].includes(metric))throw new Error('Metric must be preHitDamage or modeledHpLost');
  if(!Array.isArray(evidenceFiles)||evidenceFiles.length===0||evidenceFiles.some(value=>typeof value!=='string'||!value))throw new Error('At least one pre-outcome evidence file is required');
  const scenario=readExisting(scenarioFile,'Scenario');
  const evidence=evidenceFiles.map(value=>readExisting(value,'Pre-outcome evidence'));
  if(evidence.some(item=>item.path===scenario.path))throw new Error('Pre-outcome evidence must be separate from the scenario');
  const output=insideRoot(outputFile,'Output');
  const outputRel=relative(observationRoot,output);
  if(!outputRel||outputRel.startsWith('..')||isAbsolute(outputRel))throw new Error('Output must be inside research/observations');
  if(existsSync(output))throw new Error('Prediction freeze already exists; refusing to overwrite chronology evidence');
  const input=JSON.parse(scenario.bytes.toString('utf8'));
  if(input.mode!=='experimental')throw new Error('Explicit experimental scenario required');
  const runtimeFingerprint=verifyRuntimeManifest(),result=calculateDamage(input);
  const models=result.experimentalModels.filter(model=>Object.hasOwn(model,metric));
  if(models.length!==1||!Number.isFinite(models[0][metric]))throw new Error('Requested metric is unavailable or ambiguous');
  const prediction={scenarioFile:relativePath(scenario.path),scenarioSha256:hash(scenario.bytes),runtimeFingerprint,metric};
  const record={schemaVersion:1,kind:'MORIMENS_PREDICTION_FREEZE',createdAtUtc:now().toISOString(),prediction,predictedDamage:models[0][metric],predictionScope:models[0].scope,
    unresolvedDependencies:result.unresolvedDependencies,beforeOutcomeEvidence:evidence.map(item=>({path:relativePath(item.path),sha256:hash(item.bytes)}))};
  writeFileSync(output,JSON.stringify(record,null,2)+'\n',{encoding:'utf8',flag:'wx'});
  const outputBytes=readFileSync(output);
  return {path:relativePath(output),sha256:hash(outputBytes),prediction,predictedDamage:record.predictedDamage};
}

function parseArgs(args){
  const parsed={evidenceFiles:[]};
  for(let i=0;i<args.length;i++){
    const flag=args[i],value=args[++i];
    if(!value||!['--scenario','--metric','--evidence','--output'].includes(flag))throw new Error('Usage: node tools/freeze_gameplay_prediction.mjs --scenario <file> --metric <preHitDamage|modeledHpLost> --evidence <pre-outcome-file> [--evidence <file> ...] --output <research/observations/...json>');
    if(flag==='--evidence')parsed.evidenceFiles.push(value);
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
