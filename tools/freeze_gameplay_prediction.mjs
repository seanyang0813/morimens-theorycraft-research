import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {isAbsolute,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runObservationScenario} from '../engine/observation-scenario.mjs';
import {createObservationRuntimeContract,verifyRuntimeManifest} from './verify_runtime_manifest.mjs';
import {loadSkillCommandData} from './load_skill_command_data.mjs';

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
function validateBuildEvidence(items,recordedCombatBuild){
  if(!['pc-res144-build51','pc-res150-build51','pc-res151-build51','pc-res153-build51'].includes(recordedCombatBuild))throw new Error('Recorded combat build is not supported by the prediction runtime');
  let recognized=false,adapterCompatibility=!['pc-res151-build51','pc-res153-build51'].includes(recordedCombatBuild);
  for(const item of items){
    let value;try{value=JSON.parse(item.bytes.toString('utf8'));}catch{continue;}
    if(value?.schemaVersion===1&&value.kind==='MORIMENS_PC_COMBAT_BUILD_COMPARISON'&&value.currentBuild===recordedCombatBuild){
      const version=value.currentVersion,source=value.sourceHashes;
      if(!version||!Number.isInteger(version.resVersion)||!Number.isInteger(version.buildVersion)||typeof source?.versionManifest!=='string'||!/^[0-9a-f]{64}$/.test(source.versionManifest)||!source.bundles||typeof source.bundles!=='object')throw new Error('PC combat-build evidence is structurally incomplete');
      recognized=true;
    }
    if(value?.schemaVersion===1&&value.kind==='MORIMENS_PC_REPLAY_ADAPTER_BUILD_COMPATIBILITY'&&value.afterBuild===recordedCombatBuild&&value.status==='SUPPORTED_FOR_NARROW_REPLAY_ADAPTER_BY_EXACT_CARRYFORWARD')adapterCompatibility=true;
    if(recordedCombatBuild==='pc-res153-build51'&&value?.schemaVersion===1&&value.kind==='MORIMENS_PC_REPLAY_ADAPTER_BUILD_COMPATIBILITY'&&value.afterBuild===recordedCombatBuild&&value.status==='SUPPORTED_FOR_NARROW_ORDINARY_ACTIVE_PREHIT_ADAPTER_BY_SELECTED_CARRYFORWARD')adapterCompatibility=true;
  }
  if(!recognized)throw new Error('At least one recognized build report must identify the recorded combat build');
  if(!adapterCompatibility)throw new Error('Current replay predictions require the matching adapter compatibility report');
}

export function validateRecordedBuildEvidence(recordedCombatBuild=null,buildEvidenceFiles=[]){
  if(!Array.isArray(buildEvidenceFiles)||buildEvidenceFiles.some(value=>typeof value!=='string'||!value))throw new Error('Build evidence must be a list of files');
  const hasBuild=typeof recordedCombatBuild==='string'&&recordedCombatBuild.length>0&&recordedCombatBuild.length<=128;
  if((recordedCombatBuild!==null&&!hasBuild)||(hasBuild!==Boolean(buildEvidenceFiles.length)))throw new Error('Recorded combat build and at least one build-evidence file must be supplied together');
  const buildEvidence=buildEvidenceFiles.map(value=>readExisting(value,'Build evidence'));
  if(hasBuild)validateBuildEvidence(buildEvidence,recordedCombatBuild);
  return {hasBuild,buildEvidence};
}

export function validateFixedRuntimeEvidence(input,recordedCombatBuild,buildEvidence){
  if(input?.damageType!=='FIXED'||recordedCombatBuild!=='pc-res151-build51')return;
  const supported=buildEvidence.some(item=>{
    let report;try{report=JSON.parse(item.bytes.toString('utf8'));}catch{return false;}
    const fixed=report?.results?.Fixed;
    return report?.kind==='MORIMENS_PC_RES151_FIXED_PURE_RUNTIME_COMPARISON'&&report.installedBuild===recordedCombatBuild&&report.status==='EXACT_MATCH_IN_SYNTHETIC_FIXTURE_DOMAIN'&&/^[0-9a-f]{64}$/.test(report.sourceHashes?.modules?.BEFixedDamage??'')&&Number.isSafeInteger(fixed?.fixtures)&&fixed.fixtures>0&&fixed.exactMatches===fixed.fixtures&&fixed.mismatches===0;
  });
  if(!supported)throw new Error('Resource-151 Fixed prediction requires the installed Fixed-runtime comparison report');
}

export function freezeGameplayPrediction({scenarioFile,metric,evidenceFiles,outputFile,recordedCombatBuild=null,buildEvidenceFiles=[],now=()=>new Date()}){
  if(!['preHitDamage','modeledHpLost'].includes(metric))throw new Error('Metric must be preHitDamage or modeledHpLost');
  if(!Array.isArray(evidenceFiles)||evidenceFiles.length===0||evidenceFiles.some(value=>typeof value!=='string'||!value))throw new Error('At least one pre-outcome evidence file is required');
  const {hasBuild,buildEvidence}=validateRecordedBuildEvidence(recordedCombatBuild,buildEvidenceFiles);
  const scenario=readExisting(scenarioFile,'Scenario');
  const evidence=evidenceFiles.map(value=>readExisting(value,'Pre-outcome evidence'));
  if(evidence.some(item=>item.path===scenario.path))throw new Error('Pre-outcome evidence must be separate from the scenario');
  if(buildEvidence.some(item=>item.path===scenario.path))throw new Error('Build evidence must be separate from the scenario');
  const output=insideRoot(outputFile,'Output');
  const allowed=[observationRoot,publicHoldoutRoot].some(base=>{const item=relative(base,output);return item&&!item.startsWith('..')&&!isAbsolute(item);});
  if(!allowed)throw new Error('Output must be inside research/observations or research/evidence/holdouts');
  if(existsSync(output))throw new Error('Prediction freeze already exists; refusing to overwrite chronology evidence');
  const input=JSON.parse(scenario.bytes.toString('utf8'));
  if(hasBuild){
    const scenarioBuild=input?.kind==='morimens-theorycraft-request'?input.input?.build:input?.build;
    if(scenarioBuild!==recordedCombatBuild)throw new Error('Recorded combat build must match the scenario build');
    if(recordedCombatBuild==='pc-res153-build51'&&(input?.kind!=='morimens-battle-property-snapshot-damage'||input?.schemaVersion!==1||input?.cardContext?.present!==true||metric!=='preHitDamage'))throw new Error('Resource-153 freeze is limited to ordinary replay-card Active pre-hit damage');
  }
  validateFixedRuntimeEvidence(input,recordedCombatBuild,buildEvidence);
  const runtimeFingerprint=verifyRuntimeManifest(),runtimeContract=createObservationRuntimeContract(input),context=input?.kind==='morimens-theorycraft-request'?{skillCommandData:loadSkillCommandData(input.input?.build)}:{},result=runObservationScenario(input,metric,context);
  const prediction={scenarioFile:relativePath(scenario.path),scenarioSha256:hash(scenario.bytes),runtimeFingerprint,runtimeContract,metric};
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
