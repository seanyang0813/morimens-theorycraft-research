import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const privatePath=resolve(root,'research/raw/replay-batch-native-candidate-audit.json');
const attributionPath=resolve(root,'research/evidence/replay-catalog-build-attribution.json');
const outputPath=resolve(root,'research/evidence/replay-corpus-active-audit.json');
const read=path=>readFileSync(path);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const privateBytes=read(privatePath),attributionBytes=read(attributionPath);
const audit=JSON.parse(privateBytes),attribution=JSON.parse(attributionBytes);

if(!Array.isArray(audit)||audit.length!==42)throw new Error('Expected 42 private replay audits');
const classifications=new Map(attribution.replays.map(x=>[x.observationId,x.classification]));
const allowedClassifications=new Set([
  'PC_RES144_BUILD51_CATALOG_MATCH',
  'PC_RES150_BUILD51_CATALOG_MATCH',
  'UNMATCHED_OR_INTERMEDIATE_CATALOG'
]);
const seen=new Set();
const replays=audit.map(row=>{
  if(!/^replay-batch-\d{2}$/.test(row.batch)||seen.has(row.batch))throw new Error(`Invalid or duplicate anonymous batch: ${row.batch}`);
  seen.add(row.batch);
  const classification=classifications.get(row.batch);
  if(!allowedClassifications.has(classification))throw new Error(`Missing catalog attribution: ${row.batch}`);
  const out={
    observationId:row.batch,
    catalogClassification:classification,
    completeHitSnapshots:row.completeHits,
    retrospectiveActiveCandidates:row.candidates,
    deterministicExactChecks:row.deterministicExact,
    exactRngBranchConsistencyChecks:row.rngExactBranch,
    deterministicMismatches:row.deterministicMismatch,
    rngBranchMismatches:row.rngNoExactBranch
  };
  for(const [key,value] of Object.entries(out))if(key!=='observationId'&&key!=='catalogClassification'&&(!Number.isInteger(value)||value<0))throw new Error(`Invalid ${key}: ${row.batch}`);
  if(out.retrospectiveActiveCandidates!==out.deterministicExactChecks+out.exactRngBranchConsistencyChecks+out.deterministicMismatches+out.rngBranchMismatches)throw new Error(`Candidate accounting mismatch: ${row.batch}`);
  return out;
});
const sum=key=>replays.reduce((total,row)=>total+row[key],0);
const report={
  schemaVersion:1,
  kind:'MORIMENS_SANITIZED_REPLAY_CORPUS_ACTIVE_AUDIT',
  analysisTrack:'verification',
  status:'RETROSPECTIVE_CONSISTENCY_ONLY',
  identifiersPublished:false,
  rawArtifactsPublished:false,
  publicationCredit:false,
  sourceHashes:{
    privateCandidateAudit:sha(privateBytes),
    replayCatalogBuildAttribution:sha(attributionBytes)
  },
  totals:{
    replays:replays.length,
    completeHitSnapshots:sum('completeHitSnapshots'),
    retrospectiveActiveCandidates:sum('retrospectiveActiveCandidates'),
    deterministicExactChecks:sum('deterministicExactChecks'),
    exactRngBranchConsistencyChecks:sum('exactRngBranchConsistencyChecks'),
    deterministicMismatches:sum('deterministicMismatches'),
    rngBranchMismatches:sum('rngBranchMismatches')
  },
  replays,
  scope:'Strict retrospective Active-hit candidates require a complete card-use snapshot plus exact recorded caster and skill identity. Each candidate uses its replay-embedded combat data and is classified separately by catalog attribution.',
  trackBoundary:'This is verification-track regression evidence only. It does not establish a cheese strategy, a budget composition, an optimal theorycraft sequence or a general mechanic beyond the adapter scope.',
  limitations:[
    'All outcomes were recovered before calculation; no prediction was frozen before a separate reveal',
    'Critical branch checks evaluate possible roll endpoints and do not reconstruct the original random draw',
    'Replay data does not identify the exact engine bytecode version',
    'Private replay bytes, decoded state, player identifiers, replay keys and object names are omitted',
    'Zero mismatches within the supported subset do not validate unsupported hits or complete battle simulation'
  ]
};
if(report.totals.retrospectiveActiveCandidates!==428||report.totals.deterministicExactChecks!==269||report.totals.exactRngBranchConsistencyChecks!==159||report.totals.deterministicMismatches!==0||report.totals.rngBranchMismatches!==0)throw new Error('Pinned corpus totals changed; investigate before publishing');
writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n');
console.log(`Wrote ${outputPath}`);
