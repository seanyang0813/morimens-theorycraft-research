import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('sanitized replay batch evidence preserves aggregate provenance without identifiers',()=>{
  const text=readFileSync('research/evidence/replay-batch-recovery.json','utf8'),row=JSON.parse(text);
  assert.equal(row.kind,'MORIMENS_SANITIZED_REPLAY_BATCH_RECOVERY');assert.equal(row.identifiersPublished,false);assert.equal(row.rawArtifactsPublished,false);
  assert.deepEqual(row.totals,{replays:6,records:1647,events:44532,cardUses:303,hits:432,completeHitSnapshots:177,retrospectiveActiveCandidates:15,exactRngBranchConsistencyChecks:15,deterministicExactChecks:0});
  assert.equal(row.replays.length,6);assert.ok(row.replays.every(x=>x.snapshotBoundaryStatus==='COMPLETE'&&x.unknownCommands===0&&x.unknownEvents===0&&x.recordedCombatBuild===null&&/^[0-9a-f]{64}$/.test(x.containerSha256)));
  assert.doesNotMatch(text,/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
});
