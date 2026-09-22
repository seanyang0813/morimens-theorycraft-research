import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {discoverReplayBatchFiles} from '../tools/replay_batch_files.mjs';

test('batch discovery returns complete numbered ranges in numeric order',()=>{
  const root=mkdtempSync(join(tmpdir(),'morimens-replay-batch-')),observed=join(root,'observed'),raw=join(root,'raw');mkdirSync(observed);mkdirSync(raw);
  try{
    for(const number of [10,2,7]){const label=`replay-batch-${String(number).padStart(2,'0')}`;mkdirSync(join(observed,label));writeFileSync(join(observed,label,'decoded.json'),'{}');writeFileSync(join(observed,label,'compact-index.json'),'{}');writeFileSync(join(raw,`${label}-container.json`),'{}');}
    assert.deepEqual(discoverReplayBatchFiles({batchRoot:observed,containerRoot:raw,minBatch:3,maxBatch:10}).map(row=>row.number),[7,10]);
    rmSync(join(observed,'replay-batch-07','compact-index.json'));assert.throws(()=>discoverReplayBatchFiles({batchRoot:observed,containerRoot:raw,minBatch:7,maxBatch:7}),/Incomplete replay batch 7/);
    assert.throws(()=>discoverReplayBatchFiles({batchRoot:observed,containerRoot:raw,minBatch:11,maxBatch:12}),/No complete replay batches/);
  }finally{rmSync(root,{recursive:true,force:true});}
});
