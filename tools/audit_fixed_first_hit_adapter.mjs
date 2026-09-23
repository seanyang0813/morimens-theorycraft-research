// Retrospective structure and amount audit. Even though the candidate excludes
// outcome fields, this tool opens the recorded amount after predicting it and
// must never be counted as a blind gameplay holdout.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildFixedReplayActionCandidate} from '../engine/replay-fixed-candidate.mjs';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

export function auditFixedFirstHitAdapter({indexFile,decodedFile,outputFile=null,calculationBuild='pc-res144-build51'}){
  const indexBytes=readFileSync(resolve(root,indexFile)),decodedBytes=readFileSync(resolve(root,decodedFile));
  const index=JSON.parse(indexBytes),decoded=JSON.parse(decodedBytes),catalog=decoded?.decoded?.resourceRecords;
  if(index?.kind!=='MORIMENS_REPLAY_EVENT_INDEX'||decoded?.kind!=='MORIMENS_DECODED_REPLAY'||index.inputSha256!==decoded.inputSha256||!catalog?.Skill||!catalog?.Cmd)throw new Error('Matching private index and replay-embedded Skill/Cmd catalog required');
  const counts={completeFixedSnapshots:0,eligibleFirstHits:0,exact:0,mismatches:0,unrevealed:0,eligibleActions:0,eligibleRowAlternatives:{},blocked:{}};
  const actions=new Set();
  for(const action of index.actionSnapshots??[])for(const snapshot of action.window?.hitSnapshots??[]){
    const hit=action.window?.hits?.find(item=>item.recordIndex===snapshot.recordIndex&&item.frameIndex===snapshot.frameIndex);
    if(snapshot.boundaryStatus!=='COMPLETE'||hit?.data?.beHitConfig?.damageType!==6)continue;
    counts.completeFixedSnapshots++;
    try{
      const candidate=buildFixedReplayActionCandidate({index,actionIndex:action.actionIndex,hitIndex:snapshot.hitIndex,skills:catalog.Skill,commands:catalog.Cmd,combatBuild:calculationBuild});
      counts.eligibleFirstHits++;actions.add(action.actionIndex);
      const alternatives=candidate.routing.eligibleRowIds.length;
      counts.eligibleRowAlternatives[alternatives]=(counts.eligibleRowAlternatives[alternatives]??0)+1;
      const observed=hit.data.beHitConfig.castDamage;
      if(!Number.isFinite(observed))counts.unrevealed++;
      else if(candidate.calculation.preHitDamage===observed)counts.exact++;
      else counts.mismatches++;
    }catch(error){counts.blocked[error.message]=(counts.blocked[error.message]??0)+1;}
  }
  counts.eligibleActions=actions.size;
  const report={schemaVersion:1,kind:'MORIMENS_FIXED_FIRST_HIT_ADAPTER_AUDIT',analysisTrack:'verification',status:'RETROSPECTIVE_COMPONENT_CHECK_ONLY',calculationBuild,recordedCombatBuild:null,
    corpus:{replays:1,indexSha256:sha(indexBytes),decodedSha256:sha(decodedBytes),identifiersPublished:false},counts,
    method:'Use only replay hit identity, action-start and first-hit properties/states, card arguments and embedded command rows to compute each eligible first Fixed hit. Compare with recorded castDamage only after prediction. Reject prior hits, changed referenced inputs, competing damage categories and differing eligible-row predictions.',
    limitations:['The replay outcome was already available before this audit; these matches cannot be blind holdouts or publication credit.','All selected hits come from one replay and share combat conditions.','The recorded combat build is not established by the embedded catalog or this comparison.','This predicts pre-hit castDamage only, not shield, HP, callbacks or entire card sequencing.']};
  if(outputFile)writeFileSync(resolve(root,outputFile),JSON.stringify(report,null,2)+'\n',{encoding:'utf8',flag:'wx'});
  return report;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const args=process.argv.slice(2),options={};
    for(let i=0;i<args.length;i+=2){if(!['--index','--decoded','--output','--calculation-build'].includes(args[i])||!args[i+1])throw new Error('Usage: node tools/audit_fixed_first_hit_adapter.mjs --index FILE --decoded FILE [--output FILE] [--calculation-build BUILD]');options[args[i]]=args[i+1];}
    if(!options['--index']||!options['--decoded'])throw new Error('Index and decoded replay required');
    const report=auditFixedFirstHitAdapter({indexFile:options['--index'],decodedFile:options['--decoded'],outputFile:options['--output']??null,calculationBuild:options['--calculation-build']??'pc-res144-build51'});
    console.log(JSON.stringify({kind:report.kind,status:report.status,counts:report.counts}));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
