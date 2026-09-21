import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildBlindReplayPrediction} from '../engine/replay-blind-prediction.mjs';
import {freezeGameplayPrediction} from './freeze_gameplay_prediction.mjs';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const rel=path=>relative(root,path).replaceAll('\\','/');
const read=path=>JSON.parse(readFileSync(path,'utf8'));
function inside(value,label){const path=resolve(root,value),r=relative(root,path);if(!r||r.startsWith('..')||isAbsolute(r))throw new Error(`${label} must be inside the workspace`);return path;}

export function freezeBlindReplayPrediction({indexFile,decodedFile,id,now=()=>new Date()}){
  if(!/^[a-z0-9][a-z0-9-]{2,63}$/.test(id))throw new Error('Holdout ID must be a lowercase slug');
  const indexPath=inside(indexFile,'Index'),decodedPath=inside(decodedFile,'Decoded replay');
  if(!existsSync(indexPath)||!existsSync(decodedPath))throw new Error('Private index and decoded replay are required');
  const index=read(indexPath),decoded=read(decodedPath),records=decoded?.decoded?.resourceRecords;
  if(decoded?.kind!=='MORIMENS_DECODED_REPLAY'||decoded.inputSha256!==index.inputSha256||!records||!['Skill','Cmd','MonsterConfig','AwakerConfig'].every(name=>records[name]&&typeof records[name]==='object'))throw new Error('Matching decoded replay with embedded combat catalogs required');
  const prediction=buildBlindReplayPrediction({index,skills:records.Skill,commands:records.Cmd,monsters:records.MonsterConfig,awakeners:records.AwakerConfig});
  const directory=resolve(root,'research/evidence/holdouts',id);mkdirSync(directory,{recursive:true});
  const scenarioPath=resolve(directory,'scenario.json'),evidencePath=resolve(directory,'preoutcome-evidence.json'),freezePath=resolve(directory,'prediction-freeze.json');
  for(const path of [scenarioPath,evidencePath,freezePath])if(existsSync(path))throw new Error('Blind prediction artifact already exists; refusing to overwrite chronology evidence');
  const scenario=prediction.scenario;
  const evidence={schemaVersion:1,kind:'MORIMENS_REPLAY_PREOUTCOME_EVIDENCE',createdAtUtc:now().toISOString(),holdoutId:id,inputSha256:decoded.inputSha256,
    selectionPolicy:prediction.selectionPolicy,sourceActionIndex:prediction.sourceActionIndex,sourceHitIndex:prediction.sourceHitIndex,routing:prediction.routing,
    identityCommitmentSha256:prediction.identityCommitmentSha256,sealedProjectionSha256:prediction.sealedProjectionSha256,
    catalogSha256:Object.fromEntries(['Skill','Cmd','MonsterConfig','AwakerConfig'].map(name=>[name,hash(records[name])])),
    excludedOutcomeFields:['castDamage','isCrit','oldHp','blockLose','realDamage','hpLose'],recordedCombatBuild:null,
    limitations:prediction.unresolvedDependencies};
  writeFileSync(scenarioPath,JSON.stringify(scenario,null,2)+'\n',{encoding:'utf8',flag:'wx'});
  writeFileSync(evidencePath,JSON.stringify(evidence,null,2)+'\n',{encoding:'utf8',flag:'wx'});
  const frozen=freezeGameplayPrediction({scenarioFile:rel(scenarioPath),metric:'preHitDamage',evidenceFiles:[rel(evidencePath)],outputFile:rel(freezePath),now});
  if(frozen.predictedDamage!==prediction.predictedDamage)throw new Error('Frozen scenario result differs from blind projection');
  return {id,predictedDamage:frozen.predictedDamage,scenarioFile:rel(scenarioPath),preOutcomeEvidenceFile:rel(evidencePath),freezeFile:frozen.path,freezeSha256:frozen.sha256,inputSha256:decoded.inputSha256};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const args=process.argv.slice(2),options={};for(let i=0;i<args.length;i+=2){if(!['--index','--decoded','--id'].includes(args[i])||!args[i+1])throw new Error('Usage: node tools/freeze_blind_replay_prediction.mjs --index FILE --decoded FILE --id SLUG');options[args[i]]=args[i+1];}
    if(!options['--index']||!options['--decoded']||!options['--id'])throw new Error('Index, decoded replay and ID are required');
    console.log(JSON.stringify(freezeBlindReplayPrediction({indexFile:options['--index'],decodedFile:options['--decoded'],id:options['--id']}),null,2));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
