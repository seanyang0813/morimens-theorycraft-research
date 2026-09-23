// Commit both possible critical outcomes before inspecting a chance-dependent hit.
// This is a diagnostic, not an exact blind holdout or publication evidence.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildBlindReplayPrediction} from '../engine/replay-blind-prediction.mjs';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const sha=value=>createHash('sha256').update(value).digest('hex');
const read=path=>JSON.parse(readFileSync(path,'utf8'));
function inside(path){const full=resolve(root,path),r=relative(root,full);if(!r||r.startsWith('..')||isAbsolute(r))throw new Error('Input/output must be inside the workspace');return full;}

export function freezeConditionalReplayBranches({indexFile,decodedFile,captureCandidateFile,outputFile,now=()=>new Date()}){
  const indexPath=inside(indexFile),decodedPath=inside(decodedFile),candidatePath=inside(captureCandidateFile),outputPath=inside(outputFile);
  const publicRoot=resolve(root,'research/evidence');
  for(const path of [candidatePath,outputPath]){const r=relative(publicRoot,path);if(!r||r.startsWith('..')||isAbsolute(r))throw new Error('Capture candidate and output must be public evidence');}
  const index=read(indexPath),decoded=read(decodedPath),capture=read(candidatePath);
  if(decoded.kind!=='MORIMENS_DECODED_REPLAY'||index.kind!=='MORIMENS_REPLAY_EVENT_INDEX'||decoded.inputSha256!==index.inputSha256)throw new Error('Matching private decoded replay and outcome-free index required');
  if(capture.kind!=='MORIMENS_REPLAY_SESSION_CAPTURE_EVIDENCE'||capture.status!=='CAPTURE_CANDIDATE_REQUIRES_CONTROLLED_BATTLE_REVIEW'||capture.combatDomain!=='PVE_MONSTER_TARGETS'||capture.containerSha256!==decoded.inputSha256)throw new Error('Matching unreviewed same-process PvE capture candidate required');
  const catalogs=decoded.decoded?.resourceRecords;
  if(!catalogs||!['Skill','Cmd','MonsterConfig','AwakerConfig'].every(name=>catalogs[name]&&typeof catalogs[name]==='object'))throw new Error('Embedded combat catalogs required');
  const input={index,skills:catalogs.Skill,commands:catalogs.Cmd,monsters:catalogs.MonsterConfig,awakeners:catalogs.AwakerConfig,battleApi:catalogs.BattleApi??null,combatBuild:capture.build.id};
  const critical=buildBlindReplayPrediction({...input,critRoll:1});
  const ordinary=buildBlindReplayPrediction({...input,critRoll:100});
  if(critical.sourceActionIndex!==ordinary.sourceActionIndex||critical.sourceHitIndex!==ordinary.sourceHitIndex||critical.identityCommitmentSha256!==ordinary.identityCommitmentSha256)throw new Error('Critical and ordinary branches selected different hits');
  if(critical.calculation.critResolution?.isCrit!==true||ordinary.calculation.critResolution?.isCrit!==false)throw new Error('Selected hit is not a chance-dependent crit/noncrit pair');
  const report={schemaVersion:1,kind:'MORIMENS_CONDITIONAL_REPLAY_BRANCH_FREEZE',status:'PREOUTCOME_DIAGNOSTIC_NOT_EXACT_HOLDOUT',analysisTrack:'verification',createdAtUtc:now().toISOString(),build:capture.build.id,containerSha256:decoded.inputSha256,captureCandidate:{path:relative(root,candidatePath).replaceAll('\\','/'),sha256:sha(readFileSync(candidatePath))},privateIndexSha256:sha(readFileSync(indexPath)),embeddedBattleApiSha256:catalogs.BattleApi?sha(JSON.stringify(catalogs.BattleApi)):null,sourceActionIndex:critical.sourceActionIndex,sourceHitIndex:critical.sourceHitIndex,identityCommitmentSha256:critical.identityCommitmentSha256,selectionPolicy:critical.selectionPolicy,critChanceCeil:critical.calculation.critResolution.critChanceCeil,branches:{ordinary:{hypotheticalRoll:100,critical:false,predictedPreHitDamage:ordinary.predictedDamage,scenarioSha256:sha(JSON.stringify(ordinary.scenario))},critical:{hypotheticalRoll:1,critical:true,predictedPreHitDamage:critical.predictedDamage,scenarioSha256:sha(JSON.stringify(critical.scenario))}},excludedOutcomeFields:['castDamage','isCrit','oldHp','blockLose','realDamage','hpLose'],limitations:['Actual critical RNG draw was not captured; the branch pair is not an exact prediction','Capture candidate lacks controlled-battle/Record attestation','Target identity is conditioned on the recorded hit and is not predicted','This diagnostic receives no independent holdout or publication credit']};
  writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n',{encoding:'utf8',flag:'wx'});
  return {output:relative(root,outputPath).replaceAll('\\','/'),ordinary:ordinary.predictedDamage,critical:critical.predictedDamage};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const args=process.argv.slice(2),options={};for(let i=0;i<args.length;i+=2){if(!['--index','--decoded','--capture-candidate','--output'].includes(args[i])||!args[i+1])throw new Error('Usage: node tools/freeze_conditional_replay_branches.mjs --index FILE --decoded FILE --capture-candidate FILE --output FILE');options[args[i]]=args[i+1];}
    if(Object.keys(options).length!==4)throw new Error('All four input/output paths are required');
    console.log(JSON.stringify(freezeConditionalReplayBranches({indexFile:options['--index'],decodedFile:options['--decoded'],captureCandidateFile:options['--capture-candidate'],outputFile:options['--output']})));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
