import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {buildReplayActionCandidate} from '../engine/replay-action-candidate.mjs';
import {classifyReplayCombatDomain} from '../engine/replay-combat-domain.mjs';
import {discoverReplayBatchFiles} from './replay_batch_files.mjs';

const args=process.argv.slice(2),specs=[];let output=null,combatBuild='pc-res144-build51',batchRoot=null,containerRoot=null,minBatch=0,maxBatch=Number.MAX_SAFE_INTEGER;
while(args.length){
  const flag=args.shift(),value=args.shift();
  if(!value||!['--replay','--output','--combat-build','--batch-root','--container-root','--min-batch','--max-batch'].includes(flag))throw new Error('Usage: node tools/audit_replay_batch.mjs (--replay id,index,decoded,container [...] | --batch-root DIR --container-root DIR [--min-batch N --max-batch N]) [--combat-build BUILD] --output FILE');
  if(flag==='--output')output=value;else if(flag==='--combat-build')combatBuild=value;else if(flag==='--batch-root')batchRoot=value;else if(flag==='--container-root')containerRoot=value;else if(flag==='--min-batch')minBatch=Number(value);else if(flag==='--max-batch')maxBatch=Number(value);else specs.push(value);
}
if(batchRoot||containerRoot){if(!batchRoot||!containerRoot||specs.length)throw new Error('Batch roots must be supplied together and cannot be mixed with explicit replay specifications');for(const row of discoverReplayBatchFiles({batchRoot,containerRoot,minBatch,maxBatch}))specs.push([row.observationId,row.indexPath,row.decodedPath,row.containerPath].join(','));}
if(!output||!specs.length)throw new Error('At least one replay and an output path are required');
if(!['pc-res144-build51','pc-res150-build51','pc-res151-build51'].includes(combatBuild))throw new Error('Unsupported combat build');
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const rows=[];
for(const spec of specs){
  const [observationId,indexPath,decodedPath,containerPath]=spec.split(',');
  if(!observationId||!indexPath||!decodedPath||!containerPath)throw new Error(`Invalid replay specification: ${spec}`);
  const index=read(indexPath),decoded=read(decodedPath),resources=decoded?.decoded?.resourceRecords;
  if(!resources||!['Skill','Cmd','MonsterConfig','AwakerConfig'].every(name=>resources[name]&&typeof resources[name]==='object'))throw new Error(`Embedded replay catalogs required: ${observationId}`);
  const catalogs={skills:resources.Skill,commands:resources.Cmd,monsters:resources.MonsterConfig,awakeners:resources.AwakerConfig};
  const battleDat=decoded?.decoded?.battleDat,battleConfig=resources.BattleConfig?.[String(battleDat?.battleTid)];
  const domain=classifyReplayCombatDomain(index,{battleDat,battleConfig});
  let completeHitSnapshots=0,retrospectiveActiveCandidates=0,exactRngBranchConsistencyChecks=0,deterministicExactChecks=0,deterministicMismatches=0,rngBranchMismatches=0;const candidateBlockers={};
  for(const action of index.actionSnapshots??[]){
    for(const hit of action.window?.hitSnapshots??[]){
      if(hit.boundaryStatus!=='COMPLETE')continue;
      completeHitSnapshots++;
      try{
        const candidate=buildReplayActionCandidate({index,actionIndex:action.actionIndex,hitIndex:hit.hitIndex,...catalogs,combatBuild});
        if(candidate.calculation){
          retrospectiveActiveCandidates++;
          if(candidate.comparison?.difference===0)deterministicExactChecks++;else deterministicMismatches++;
          continue;
        }
        if(candidate.calculationBlocker!=='RNG-dependent critical outcome requires a captured pre-outcome roll')continue;
        const branches=[1,100].map(critRoll=>buildReplayActionCandidate({index,actionIndex:action.actionIndex,hitIndex:hit.hitIndex,critRoll,...catalogs,combatBuild}));
        retrospectiveActiveCandidates++;
        if(branches.some(branch=>branch.comparison?.difference===0))exactRngBranchConsistencyChecks++;else rngBranchMismatches++;
      }catch(error){const reason=error instanceof Error?error.message:String(error);candidateBlockers[reason]=(candidateBlockers[reason]??0)+1;}
    }
  }
  const unknownCommands=(index.unknownCommands??[]).length,unknownEvents=(index.unknownEvents??[]).length;
  if(domain.completeHitSnapshots!==completeHitSnapshots)throw new Error(`Domain classifier coverage differs for ${observationId}`);
  rows.push({observationId,containerSha256:hash(containerPath),containerBytes:readFileSync(containerPath).length,records:index.counts?.records??0,events:index.counts?.events??index.events?.length??0,cardUses:index.counts?.cardUses??index.actionSnapshots?.length??0,hits:index.counts?.hits??index.hits?.length??0,completeHitSnapshots,completeHitTargetRoleTypes:domain.targetRoleTypes,combatDomain:domain.combatDomain,combatDomainBasis:domain.classificationBasis,snapshotBoundaryStatus:index.snapshotBoundaryStatus??null,unknownCommands,unknownEvents,retrospectiveActiveCandidates,exactRngBranchConsistencyChecks,deterministicExactChecks,deterministicMismatches,rngBranchMismatches,candidateBlockers,calculationBuild:combatBuild,recordedCombatBuild:null,catalogSource:'replay-embedded-resource-records'});
}
writeFileSync(output,JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify({combatBuild,replays:rows.length,retrospectiveActiveCandidates:rows.reduce((n,row)=>n+row.retrospectiveActiveCandidates,0),deterministicExactChecks:rows.reduce((n,row)=>n+row.deterministicExactChecks,0),deterministicMismatches:rows.reduce((n,row)=>n+row.deterministicMismatches,0),exactRngBranchConsistencyChecks:rows.reduce((n,row)=>n+row.exactRngBranchConsistencyChecks,0),rngBranchMismatches:rows.reduce((n,row)=>n+row.rngBranchMismatches,0)}));
