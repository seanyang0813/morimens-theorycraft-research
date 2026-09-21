import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {buildReplayActionCandidate} from '../engine/replay-action-candidate.mjs';

const args=process.argv.slice(2),specs=[];let output=null;
while(args.length){
  const flag=args.shift(),value=args.shift();
  if(!value||!['--replay','--output'].includes(flag))throw new Error('Usage: node tools/audit_replay_batch.mjs --replay id,index,decoded,container [--replay ...] --output FILE');
  if(flag==='--output')output=value;else specs.push(value);
}
if(!output||!specs.length)throw new Error('At least one replay and an output path are required');
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const rows=[];
for(const spec of specs){
  const [observationId,indexPath,decodedPath,containerPath]=spec.split(',');
  if(!observationId||!indexPath||!decodedPath||!containerPath)throw new Error(`Invalid replay specification: ${spec}`);
  const index=read(indexPath),decoded=read(decodedPath),resources=decoded?.decoded?.resourceRecords;
  if(!resources||!['Skill','Cmd','MonsterConfig','AwakerConfig'].every(name=>resources[name]&&typeof resources[name]==='object'))throw new Error(`Embedded replay catalogs required: ${observationId}`);
  const catalogs={skills:resources.Skill,commands:resources.Cmd,monsters:resources.MonsterConfig,awakeners:resources.AwakerConfig};
  let completeHitSnapshots=0,retrospectiveActiveCandidates=0,exactRngBranchConsistencyChecks=0,deterministicExactChecks=0,deterministicMismatches=0,rngBranchMismatches=0;
  for(const action of index.actionSnapshots??[]){
    for(const hit of action.window?.hitSnapshots??[]){
      if(hit.boundaryStatus!=='COMPLETE')continue;
      completeHitSnapshots++;
      try{
        const candidate=buildReplayActionCandidate({index,actionIndex:action.actionIndex,hitIndex:hit.hitIndex,...catalogs});
        if(candidate.calculation){
          retrospectiveActiveCandidates++;
          if(candidate.comparison?.difference===0)deterministicExactChecks++;else deterministicMismatches++;
          continue;
        }
        if(candidate.calculationBlocker!=='RNG-dependent critical outcome requires a captured pre-outcome roll')continue;
        const branches=[1,100].map(critRoll=>buildReplayActionCandidate({index,actionIndex:action.actionIndex,hitIndex:hit.hitIndex,critRoll,...catalogs}));
        retrospectiveActiveCandidates++;
        if(branches.some(branch=>branch.comparison?.difference===0))exactRngBranchConsistencyChecks++;else rngBranchMismatches++;
      }catch{}
    }
  }
  const unknownCommands=(index.unknownCommands??[]).length,unknownEvents=(index.unknownEvents??[]).length;
  rows.push({observationId,containerSha256:hash(containerPath),containerBytes:readFileSync(containerPath).length,records:index.counts?.records??0,events:index.counts?.events??index.events?.length??0,cardUses:index.counts?.cardUses??index.actionSnapshots?.length??0,hits:index.counts?.hits??index.hits?.length??0,completeHitSnapshots,snapshotBoundaryStatus:index.snapshotBoundaryStatus??null,unknownCommands,unknownEvents,retrospectiveActiveCandidates,exactRngBranchConsistencyChecks,deterministicExactChecks,deterministicMismatches,rngBranchMismatches,recordedCombatBuild:null,catalogSource:'replay-embedded-resource-records'});
}
writeFileSync(output,JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify({replays:rows.length,retrospectiveActiveCandidates:rows.reduce((n,row)=>n+row.retrospectiveActiveCandidates,0),deterministicExactChecks:rows.reduce((n,row)=>n+row.deterministicExactChecks,0),deterministicMismatches:rows.reduce((n,row)=>n+row.deterministicMismatches,0),exactRngBranchConsistencyChecks:rows.reduce((n,row)=>n+row.exactRngBranchConsistencyChecks,0),rngBranchMismatches:rows.reduce((n,row)=>n+row.rngBranchMismatches,0)}));
