// One pinned, outcome-first gameplay regression. Never grants holdout credit.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {buildReplayActionCandidate} from '../engine/replay-action-candidate.mjs';

const read=path=>readFileSync(path),parse=path=>JSON.parse(read(path)),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const indexPath='research/observations/chapter-1-7-20260923-06-index.json';
const decodedPath='research/observations/chapter-1-7-20260923-06-decoded.json';
const priorPath='research/evidence/chapter-1-7-exploratory-pve-audit-20260923.json';
const index=parse(indexPath),decoded=parse(decodedPath),prior=parse(priorPath);
if(index.inputSha256!==decoded.inputSha256||index.inputSha256!==prior.selectedContainerSha256||prior.combatDomain!=='PVE_MONSTER_TARGETS')throw new Error('Pinned private replay and PvE provenance do not match');
const records=decoded.decoded?.resourceRecords;
if(!records||!['Skill','Cmd','MonsterConfig','AwakerConfig'].every(name=>records[name]))throw new Error('Complete embedded combat catalog required');
const candidate=buildReplayActionCandidate({index,actionIndex:1,combatBuild:'pc-res151-build51',skills:records.Skill,commands:records.Cmd,monsters:records.MonsterConfig,awakeners:records.AwakerConfig});
if(candidate.routing.rowSelection.length!==1||candidate.routing.rowSelection[0].type!=='BEActiveDamage.State'||candidate.identities.skillId!==61120||candidate.routing.stateSideEffect?.modeling!=='excluded-after-hit')throw new Error('Pinned state-attached Active routing changed');
if(candidate.calculation?.critResolution?.reason!=='caster_certain_crit'||candidate.calculation.critResolution.deterministic!==true||candidate.calculation.preHitDamage!==75||candidate.comparison?.observed!==75||candidate.comparison.difference!==0)throw new Error('Pinned deterministic comparison changed');
const report={schemaVersion:1,kind:'MORIMENS_STATE_ATTACHED_ACTIVE_REPLAY_REGRESSION',analysisTrack:'verification',status:'RETROSPECTIVE_EXACT_COMPONENT_MATCH',combatDomain:'PVE_MONSTER_TARGETS',calculationBuild:'pc-res151-build51',recordedEngineBuild:'UNRECORDED',selectedContainerSha256:index.inputSha256,sourceSha256:{privateIndex:sha(read(indexPath)),privateDecoded:sha(read(decodedPath)),priorCaptureAudit:sha(read(priorPath))},route:{skillId:61120,effectType:'BEActiveDamage.State',guaranteedCriticalReason:'caster_certain_crit',afterHitStateMode:'excluded-after-hit'},comparison:{metric:candidate.comparison.metric,predicted:candidate.comparison.predicted,observed:candidate.comparison.observed,difference:candidate.comparison.difference},publicationCredit:false,limitations:['The replay outcome was decoded before this adapter path was implemented; this is a retrospective regression, not a blind prediction.','The replay does not serialize its engine-code version. Resource-151 is the calculation build, not a proved recorded engine build.','Only the selected first-hit pre-hit damage is compared. Its attached state grant, later hits, full card use, defense and encounter outcome are not validated by this check.','No account, player, replay key, card-instance or role-instance identifier is published.']};
const output='research/evidence/state-attached-active-replay-regression-20260923.json';
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,status:report.status,exactMatch:report.comparison.difference===0,publicationCredit:false}));
