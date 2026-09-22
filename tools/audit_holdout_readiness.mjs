import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildReplayActionCandidate} from '../engine/replay-action-candidate.mjs';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const args=process.argv.slice(2),options={};
for(let i=0;i<args.length;i+=2){if(!['--batch-root','--min-batch','--max-batch','--character-tid','--output'].includes(args[i])||!args[i+1])throw new Error('Usage: node tools/audit_holdout_readiness.mjs --batch-root DIR --min-batch N --max-batch N --character-tid ID --output research/raw/FILE.json');options[args[i]]=args[i+1];}
const batchRoot=resolve(root,options['--batch-root']??''),min=Number(options['--min-batch']),max=Number(options['--max-batch']),characterTid=Number(options['--character-tid']),output=resolve(root,options['--output']??'');
const outputRelative=relative(resolve(root,'research/raw'),output);
if(!options['--batch-root']||!Number.isSafeInteger(min)||!Number.isSafeInteger(max)||min<0||max<min||!Number.isSafeInteger(characterTid)||characterTid<=0||!outputRelative||outputRelative.startsWith('..')||isAbsolute(outputRelative))throw new Error('Explicit batch range, positive character ID and private output are required');
if(existsSync(output))throw new Error('Refusing to overwrite private holdout-readiness audit');
const read=path=>JSON.parse(readFileSync(path,'utf8')),skills=new Map();let replayCount=0,completeHitSnapshots=0,deterministicExactHits=0,deterministicMismatches=0;
for(let batch=min;batch<=max;batch++){
  const name=`replay-batch-${String(batch).padStart(2,'0')}`,indexPath=resolve(batchRoot,name,'compact-index.json'),decodedPath=resolve(batchRoot,name,'decoded.json');
  if(!existsSync(indexPath)||!existsSync(decodedPath))continue;
  replayCount++;const index=read(indexPath),decoded=read(decodedPath),records=decoded?.decoded?.resourceRecords;
  if(!records||!['Skill','Cmd','MonsterConfig','AwakerConfig'].every(key=>records[key]&&typeof records[key]==='object'))throw new Error(`Embedded catalogs required: ${name}`);
  const catalogs={skills:records.Skill,commands:records.Cmd,monsters:records.MonsterConfig,awakeners:records.AwakerConfig};
  for(const action of index.actionSnapshots??[])for(const hit of action.window?.hitSnapshots??[]){
    if(hit.boundaryStatus!=='COMPLETE')continue;completeHitSnapshots++;
    try{
      const candidate=buildReplayActionCandidate({index,actionIndex:action.actionIndex,hitIndex:hit.hitIndex,...catalogs});
      const card=action.cards?.[String(action.cardUid)],caster=hit.roles?.[String(card?.ownerUid)];
      if(caster?.tid!==characterTid||!candidate.calculation?.critResolution.deterministic)continue;
      if(candidate.comparison?.difference!==0){deterministicMismatches++;continue;}
      deterministicExactHits++;const id=candidate.identities.skillId,current=skills.get(id)??{skillId:id,count:0,minCritChanceCeil:Number.POSITIVE_INFINITY,maxCritChanceCeil:Number.NEGATIVE_INFINITY,tags:candidate.routing.tags};
      current.count++;current.minCritChanceCeil=Math.min(current.minCritChanceCeil,candidate.calculation.critResolution.critChanceCeil);current.maxCritChanceCeil=Math.max(current.maxCritChanceCeil,candidate.calculation.critResolution.critChanceCeil);skills.set(id,current);
    }catch{}
  }
}
const report={schemaVersion:1,kind:'MORIMENS_PRIVATE_HOLDOUT_READINESS_AUDIT',analysisTrack:'verification',calculationBuild:'pc-res144-build51',recordedCombatBuild:null,characterTid,replayCount,completeHitSnapshots,deterministicExactHits,deterministicMismatches,skills:[...skills.values()].sort((a,b)=>b.count-a.count||a.skillId-b.skillId),limitations:['Retrospective outcome-first scan only','Recorded engine builds are unknown','No player, replay, role-instance or card-instance identifiers retained']};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output:relative(root,output).replaceAll('\\','/'),replayCount,deterministicExactHits,deterministicMismatches,skills:report.skills.length}));
