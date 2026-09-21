import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const hash=value=>createHash('sha256').update(Buffer.isBuffer(value)?value:typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const rel=path=>relative(root,path).replaceAll('\\','/');
const read=path=>JSON.parse(readFileSync(path,'utf8'));
function inside(value,label){const path=resolve(root,value),r=relative(root,path);if(!r||r.startsWith('..')||isAbsolute(r))throw new Error(`${label} must be inside the workspace`);return path;}
function committedUnchanged(path){const name=rel(path);let bytes;try{bytes=execFileSync('git',['show',`HEAD:${name}`],{cwd:root});}catch{throw new Error(`Freeze chronology artifact is not committed at HEAD: ${name}`);}if(hash(bytes)!==hash(readFileSync(path)))throw new Error(`Freeze chronology artifact differs from HEAD: ${name}`);}

export function revealBlindReplayPrediction({indexFile,freezeFile,observationFile}){
  const indexPath=inside(indexFile,'Index'),freezePath=inside(freezeFile,'Freeze'),outputPath=inside(observationFile,'Observation output');
  if(!existsSync(indexPath)||!existsSync(freezePath))throw new Error('Replay index and committed prediction freeze required');
  const freeze=read(freezePath);if(freeze.kind!=='MORIMENS_PREDICTION_FREEZE')throw new Error('Supported prediction freeze required');
  const evidenceItem=freeze.beforeOutcomeEvidence?.[0],evidencePath=inside(evidenceItem?.path??'','Pre-outcome evidence');
  if(hash(readFileSync(evidencePath))!==evidenceItem.sha256)throw new Error('Pre-outcome evidence hash mismatch');
  committedUnchanged(freezePath);committedUnchanged(evidencePath);committedUnchanged(inside(freeze.prediction.scenarioFile,'Scenario'));
  if(existsSync(outputPath))throw new Error('Observation already exists; refusing to overwrite reveal evidence');
  const index=read(indexPath),evidence=read(evidencePath);if(index.inputSha256!==evidence.inputSha256)throw new Error('Reveal replay differs from frozen input commitment');
  const action=index.actionSnapshots?.[evidence.sourceActionIndex],snapshot=action?.window?.hitSnapshots?.find(row=>row.hitIndex===evidence.sourceHitIndex);
  if(!action||!snapshot)throw new Error('Frozen action/hit boundary is unavailable');
  const hit=action.window.hits?.find(row=>row.recordIndex===snapshot.recordIndex&&row.frameIndex===snapshot.frameIndex),observed=hit?.data?.beHitConfig;
  const card=action.cards?.[String(action.cardUid)],identity={cardUid:card?.uid,skillId:card?.tid,casterUid:observed?.castRoleUid,targetUid:hit?.data?.roleUid};
  if(hash(identity)!==evidence.identityCommitmentSha256)throw new Error('Revealed hit identity differs from frozen commitment');
  if(!Number.isFinite(observed?.castDamage))throw new Error('Finite recorded castDamage required');
  const outcomePath=resolve(freezePath,'../outcome-evidence.json');if(existsSync(outcomePath))throw new Error('Outcome evidence already exists; refusing to overwrite');
  const predicted=freeze.predictedDamage,difference=predicted-observed.castDamage;
  const outcome={schemaVersion:1,kind:'MORIMENS_REPLAY_OUTCOME_EVIDENCE',revealedAtUtc:new Date().toISOString(),holdoutId:evidence.holdoutId,inputSha256:evidence.inputSha256,sourceActionIndex:evidence.sourceActionIndex,sourceHitIndex:evidence.sourceHitIndex,identityCommitmentSha256:evidence.identityCommitmentSha256,observedDamage:observed.castDamage,predictedDamage:predicted,difference};
  writeFileSync(outcomePath,JSON.stringify(outcome,null,2)+'\n',{encoding:'utf8',flag:'wx'});
  const observation={id:evidence.holdoutId,kind:'REAL_GAME_OBSERVATION',status:'COMPLETE_BUILD_UNCONFIRMED',holdout:true,source:'Authorized selected-profile native replay; identifiers withheld',version:{viewingClient:'PC downloaded res144 build51',recordedCombatBuild:null},visibleState:{sourceActionIndex:evidence.sourceActionIndex,sourceHitIndex:evidence.sourceHitIndex,skillId:evidence.routing.skillId,commandId:evidence.routing.commandId,rowId:evidence.routing.rowId,repetitionPerExecution:evidence.routing.repetitionPerExecution},assumedState:{},uncertainState:['Recorded engine-code version is not explicit in the replay payload'],observedDamage:observed.castDamage,predictedDamage:predicted,difference,mechanicsExercised:['Deterministic Active damage','Replay-embedded combat catalogs','One-enemy first-hit prediction'],prediction:freeze.prediction,predictionFrozenBeforeOutcomeEvidence:{path:rel(freezePath),sha256:hash(readFileSync(freezePath))},evidence:[evidenceItem.path,rel(outcomePath)]};
  writeFileSync(outputPath,JSON.stringify(observation,null,2)+'\n',{encoding:'utf8',flag:'wx'});
  return {id:evidence.holdoutId,observedDamage:observed.castDamage,predictedDamage:predicted,difference,outcomeEvidenceFile:rel(outcomePath),observationFile:rel(outputPath)};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const args=process.argv.slice(2),options={};for(let i=0;i<args.length;i+=2){if(!['--index','--freeze','--observation'].includes(args[i])||!args[i+1])throw new Error('Usage: node tools/reveal_blind_replay_prediction.mjs --index FILE --freeze FILE --observation FILE');options[args[i]]=args[i+1];}
    if(!options['--index']||!options['--freeze']||!options['--observation'])throw new Error('Index, freeze and observation output are required');
    console.log(JSON.stringify(revealBlindReplayPrediction({indexFile:options['--index'],freezeFile:options['--freeze'],observationFile:options['--observation']}),null,2));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
