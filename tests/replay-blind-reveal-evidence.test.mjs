import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateFrozenEvidence} from '../tools/reveal_blind_replay_prediction.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const sha=value=>createHash('sha256').update(value).digest('hex');

test('blind reveal validates and commit-checks every frozen pre-outcome evidence file',()=>{
  const directory=mkdtempSync(join(root,'research/observations/reveal-evidence-test-'));
  try{
    const first=join(directory,'projection.json'),second=join(directory,'capture.json');writeFileSync(first,'first');writeFileSync(second,'second');
    const freeze={beforeOutcomeEvidence:[{path:relative(root,first),sha256:sha('first')},{path:relative(root,second),sha256:sha('second')}]},checked=[];
    const result=validateFrozenEvidence(freeze,{commitCheck:path=>checked.push(path)});
    assert.equal(result.evidencePaths.length,2);assert.deepEqual(checked,result.evidencePaths);
    writeFileSync(second,'changed');assert.throws(()=>validateFrozenEvidence(freeze,{commitCheck:()=>{}}),/hash mismatch/);
  }finally{rmSync(directory,{recursive:true,force:true});}
});
