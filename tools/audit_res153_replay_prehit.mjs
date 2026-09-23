// Retrospective branch audit only. Observed critical flags never enter the calculator.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {buildReplayActionCandidate} from '../engine/replay-action-candidate.mjs';

const [indexPath,decodedPath,outputPath]=process.argv.slice(2);
if(!indexPath||!decodedPath||!outputPath)throw new Error('Usage: node tools/audit_res153_replay_prehit.mjs INDEX DECODED OUTPUT');
const bytes=path=>readFileSync(path);
const sha=path=>createHash('sha256').update(bytes(path)).digest('hex');
const index=JSON.parse(bytes(indexPath)),decoded=JSON.parse(bytes(decodedPath));
if(index.kind!=='MORIMENS_REPLAY_EVENT_INDEX'||decoded.kind!=='MORIMENS_DECODED_REPLAY')throw new Error('Decoded replay and indexed events required');
const records=decoded.decoded?.resourceRecords;
if(!records||!['Skill','Cmd','MonsterConfig','AwakerConfig'].every(name=>records[name]&&typeof records[name]==='object'))throw new Error('Replay-embedded combat catalogs required');
const catalogs={skills:records.Skill,commands:records.Cmd,monsters:records.MonsterConfig,awakeners:records.AwakerConfig,battleApi:records.BattleApi??null};
const hits=[];
for(const action of index.actionSnapshots??[]){
  for(const snapshot of action.window?.hitSnapshots??[]){
    const row={actionIndex:action.actionIndex,hitIndex:snapshot.hitIndex};
    try{
      const card=action.cards?.[String(action.cardUid)];
      const hit=(action.window?.hits??[]).find(item=>item.recordIndex===snapshot.recordIndex&&item.frameIndex===snapshot.frameIndex);
      const observedIdentity=hit?.data?.beHitConfig;
      if(!card||!observedIdentity)throw new Error('Played card and hit identity required');
      if(observedIdentity.castRoleUid!==card.ownerUid||observedIdentity.skillConfigId!==card.tid){
        row.status='NON_PLAYED_CARD_HIT';
        row.reason='Recorded hit caster or skill differs from the card played in this action window';
        hits.push(row);
        continue;
      }
      const variants=[1,100].map(critRoll=>buildReplayActionCandidate({index,actionIndex:action.actionIndex,hitIndex:snapshot.hitIndex,critRoll,combatBuild:'pc-res153-build51',...catalogs}));
      const observed=variants[0].observedHit?.data?.beHitConfig;
      if(typeof observed?.isCrit!=='boolean'||!Number.isFinite(observed?.castDamage))throw new Error('Complete observed critical and cast-damage fields required');
      row.status='BRANCH_COMPARISON';
      row.observed={isCrit:observed.isCrit,castDamage:observed.castDamage};
      row.branches=variants.map((variant,i)=>({probeRoll:[1,100][i],isCrit:variant.calculation.critResolution.isCrit,preHitDamage:variant.calculation.preHitDamage}));
      const matching=row.branches.filter(branch=>branch.isCrit===observed.isCrit);
      row.observedBranchComparison=matching.length?{predicted:matching[0].preHitDamage,difference:matching[0].preHitDamage-observed.castDamage}:null;
    }catch(error){row.status='BLOCKED';row.blocker=error.message;}
    hits.push(row);
  }
}
const compared=hits.filter(row=>row.status==='BRANCH_COMPARISON');
const report={
  schemaVersion:1,kind:'MORIMENS_RES153_REPLAY_PREHIT_RETROSPECTIVE_AUDIT',build:'pc-res153-build51',
  status:'RETROSPECTIVE_DIAGNOSTIC_ONLY',
  sourceCommitments:{indexSha256:sha(indexPath),decodedSha256:sha(decodedPath),containerSha256:decoded.inputSha256},
  counts:{actions:index.actionSnapshots?.length??0,hits:hits.length,compared:compared.length,exactObservedBranch:compared.filter(row=>row.observedBranchComparison?.difference===0).length,nonPlayedCardHits:hits.filter(row=>row.status==='NON_PLAYED_CARD_HIT').length,blocked:hits.filter(row=>row.status==='BLOCKED').length},
  hits,
  method:'Calculate roll-1 and roll-100 branches independently from each replay-embedded row and pre-hit snapshot; only afterward match the recorded isCrit flag and compare the recorded castDamage.',
  limitations:[
    'Selecting a critical branch with the observed isCrit flag is retrospective and gives no predictive or holdout credit.',
    'The replay was inspected during capture; no result here is a frozen pre-outcome prediction.',
    'One retrospective replay does not establish general current-build correctness.',
    'Hits with a caster or skill different from the played card are excluded, not assigned damage predictions; their trigger graph remains unresolved.',
    'Player, card, skill and target identifiers are omitted from this public report.',
  ],
};
writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,counts:report.counts}));
