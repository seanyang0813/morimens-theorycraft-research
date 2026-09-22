import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,rmSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));

test('private replay batch processor plans a bounded resumable batch without reading outcomes',()=>{
  const raw=`research/raw/batch-processor-test-${process.pid}`,observations=`research/observations/batch-processor-test-${process.pid}`;
  mkdirSync(`${root}/${raw}`,{recursive:true});mkdirSync(`${root}/${observations}/replay-batch-902`,{recursive:true});
  try{
    writeFileSync(`${root}/${raw}/replay-batch-901-container.json`,'{}');
    writeFileSync(`${root}/${raw}/replay-batch-902-container.json`,'{}');
    writeFileSync(`${root}/${observations}/replay-batch-902/decoded.json`,'{}');
    writeFileSync(`${root}/${observations}/replay-batch-902/compact-index.json`,'{}');
    const run=spawnSync('python',['tools/process_private_replay_batch.py','--input-glob',`batch-processor-test-${process.pid}/replay-batch-*-container.json`,'--output-root',observations,'--min-batch','901','--max-batch','902','--workers','2','--plan-only'],{cwd:root,encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);const plan=JSON.parse(run.stdout);
    assert.equal(plan.selected,2);assert.deepEqual(plan.pending.map(row=>row.batch),[901]);assert.deepEqual(plan.skipped.map(row=>row.batch),[902]);assert.equal(plan.fullIndex,false);
    const outside=spawnSync('python',['tools/process_private_replay_batch.py','--input-glob',`batch-processor-test-${process.pid}/*.json`,'--output-root','research/evidence','--plan-only'],{cwd:root,encoding:'utf8'});
    assert.notEqual(outside.status,0);assert.match(outside.stderr,/inside research\/observations/);
  }finally{rmSync(`${root}/${raw}`,{recursive:true,force:true});rmSync(`${root}/${observations}`,{recursive:true,force:true});}
});
