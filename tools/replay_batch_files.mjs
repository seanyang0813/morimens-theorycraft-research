import {readdirSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';

export function discoverReplayBatchFiles({batchRoot,containerRoot,minBatch=0,maxBatch=Number.MAX_SAFE_INTEGER}){
  if(!Number.isSafeInteger(minBatch)||!Number.isSafeInteger(maxBatch)||minBatch<0||maxBatch<minBatch)throw new Error('Valid inclusive replay batch range required');
  const observed=resolve(batchRoot),raw=resolve(containerRoot),rows=[];
  for(const entry of readdirSync(observed,{withFileTypes:true})){
    const match=/^replay-batch-(\d+)$/.exec(entry.name);if(!entry.isDirectory()||!match)continue;
    const number=Number(match[1]);if(number<minBatch||number>maxBatch)continue;
    const compactPath=join(observed,entry.name,'compact-index.json'),decodedPath=join(observed,entry.name,'decoded.json'),containerPath=join(raw,`replay-batch-${String(number).padStart(2,'0')}-container.json`);
    for(const path of [compactPath,decodedPath,containerPath])if(!statSync(path,{throwIfNoEntry:false})?.isFile())throw new Error(`Incomplete replay batch ${number}: ${path}`);
    rows.push({number,observationId:entry.name,indexPath:compactPath,decodedPath,containerPath});
  }
  rows.sort((a,b)=>a.number-b.number);if(!rows.length)throw new Error('No complete replay batches matched');return rows;
}
