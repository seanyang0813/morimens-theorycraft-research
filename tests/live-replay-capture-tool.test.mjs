import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));

test('public live replay capture helpers preserve private-reference boundaries',()=>{
  const result=spawnSync('python',['tools/test_capture_live_replay_session.py'],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,result.stdout+result.stderr);
  assert.match(result.stderr,/Ran 6 tests/);
});

test('public live replay capture CLI exposes baseline and delta modes',()=>{
  const result=spawnSync('python',['tools/capture_live_replay_session.py','--help'],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/baseline/);assert.match(result.stdout,/delta/);
});

test('live process guard rejects a non-Morimens PID before creating output',()=>{
  const output='research/raw/node-process-must-not-capture.json';
  assert.equal(existsSync(resolve(root,output)),false);
  const result=spawnSync('python',['tools/capture_live_replay_session.py','baseline','--pid',String(process.pid),'--output',output],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,1);assert.equal(existsSync(resolve(root,output)),false);
  const failure=JSON.parse(result.stderr);assert.equal(failure.error,'ValueError');assert.match(failure.message,/Morimens\.exe/);
});
