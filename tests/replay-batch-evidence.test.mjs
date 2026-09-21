import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('sanitized replay batch evidence preserves aggregate provenance without identifiers',()=>{
  const text=readFileSync('research/evidence/replay-batch-recovery.json','utf8'),row=JSON.parse(text);
  assert.equal(row.kind,'MORIMENS_SANITIZED_REPLAY_BATCH_RECOVERY');assert.equal(row.identifiersPublished,false);assert.equal(row.rawArtifactsPublished,false);
  assert.deepEqual(row.totals,{replays:10,records:3011,events:86317,cardUses:589,hits:900,completeHitSnapshots:437,retrospectiveActiveCandidates:178,exactRngBranchConsistencyChecks:56,deterministicExactChecks:122,deterministicMismatches:0,rngBranchMismatches:0});
  assert.equal(row.replays.length,10);assert.ok(row.replays.every(x=>x.snapshotBoundaryStatus==='COMPLETE'&&x.unknownCommands===0&&x.unknownEvents===0&&x.deterministicMismatches===0&&x.rngBranchMismatches===0&&x.recordedCombatBuild===null&&x.catalogSource==='replay-embedded-resource-records'&&/^[0-9a-f]{64}$/.test(x.containerSha256)));
  assert.doesNotMatch(text,/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
});
