// Compare one selected hit only after its conditional branches are committed.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const sha=value=>createHash('sha256').update(value).digest('hex');
function pathInRoot(path){const full=resolve(root,path),r=relative(root,full);if(!r||r.startsWith('..')||isAbsolute(r))throw new Error('Path must be inside workspace');return {full,relative:r.replaceAll('\\','/')};}

export function revealConditionalReplayBranches({indexFile,freezeFile,freezeCommit,outputFile,now=()=>new Date()}){
  if(!/^[0-9a-f]{7,40}$/.test(freezeCommit))throw new Error('Git freeze commit SHA required');
  const indexPath=pathInRoot(indexFile),freezePath=pathInRoot(freezeFile),outputPath=pathInRoot(outputFile);
  const evidenceRoot=resolve(root,'research/evidence');
  for(const path of [freezePath,outputPath]){const r=relative(evidenceRoot,path.full);if(!r||r.startsWith('..')||isAbsolute(r))throw new Error('Freeze and result must be public evidence');}
  const indexBytes=readFileSync(indexPath.full),freezeBytes=readFileSync(freezePath.full);
  const committed=execFileSync('git',['show',`${freezeCommit}:${freezePath.relative}`],{cwd:root});
  if(!committed.equals(freezeBytes))throw new Error('Freeze file differs from pre-outcome Git commit');
  const index=JSON.parse(indexBytes),frozen=JSON.parse(freezeBytes);
  if(index.kind!=='MORIMENS_REPLAY_EVENT_INDEX'||frozen.kind!=='MORIMENS_CONDITIONAL_REPLAY_BRANCH_FREEZE'||frozen.status!=='PREOUTCOME_DIAGNOSTIC_NOT_EXACT_HOLDOUT'||frozen.privateIndexSha256!==sha(indexBytes)||frozen.containerSha256!==index.inputSha256)throw new Error('Matching frozen branch pair and private replay index required');
  const action=index.actionSnapshots?.find(item=>item.actionIndex===frozen.sourceActionIndex);
  const snapshot=action?.window?.hitSnapshots?.find(item=>item.hitIndex===frozen.sourceHitIndex);
  const hit=action?.window?.hits?.find(item=>item.recordIndex===snapshot?.recordIndex&&item.frameIndex===snapshot?.frameIndex);
  const outcome=hit?.data?.beHitConfig;
  if(typeof outcome?.isCrit!=='boolean'||!Number.isFinite(outcome.castDamage))throw new Error('Selected recorded damage and critical flag required');
  const branch=outcome.isCrit?'critical':'ordinary',predicted=frozen.branches?.[branch]?.predictedPreHitDamage;
  if(!Number.isFinite(predicted))throw new Error('Matching frozen critical branch required');
  const report={schemaVersion:1,kind:'MORIMENS_CONDITIONAL_REPLAY_BRANCH_RESULT',status:'BRANCH_COMPARISON_UNREVIEWED_CAPTURE',analysisTrack:'verification',createdAtUtc:now().toISOString(),freeze:{path:freezePath.relative,sha256:sha(freezeBytes),gitCommit:freezeCommit},containerSha256:frozen.containerSha256,sourceActionIndex:frozen.sourceActionIndex,sourceHitIndex:frozen.sourceHitIndex,observedCritical:outcome.isCrit,selectedBranch:branch,predictedPreHitDamage:predicted,observedPreHitDamage:outcome.castDamage,difference:predicted-outcome.castDamage,selectedOutcomeCommitmentSha256:sha(JSON.stringify(outcome)),limitations:['The actual critical RNG draw was unknown before reveal; only the branch pair was frozen','Capture provenance is a mechanically checked, unreviewed candidate; the matching Record was not loaded and attested','One branch agreement is a narrow formula diagnostic, not an exact blind holdout or publication credit']};
  writeFileSync(outputPath.full,JSON.stringify(report,null,2)+'\n',{encoding:'utf8',flag:'wx'});
  return {output:outputPath.relative,predicted,observed:outcome.castDamage,difference:report.difference};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const args=process.argv.slice(2),options={};for(let i=0;i<args.length;i+=2){if(!['--index','--freeze','--freeze-commit','--output'].includes(args[i])||!args[i+1])throw new Error('Usage: node tools/reveal_conditional_replay_branches.mjs --index FILE --freeze FILE --freeze-commit SHA --output FILE');options[args[i]]=args[i+1];}if(Object.keys(options).length!==4)throw new Error('All four arguments are required');console.log(JSON.stringify(revealConditionalReplayBranches({indexFile:options['--index'],freezeFile:options['--freeze'],freezeCommit:options['--freeze-commit'],outputFile:options['--output']})));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
