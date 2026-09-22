import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const run=input=>spawnSync(process.execPath,['tools/run_theorycraft_request.mjs','--input',input],{cwd:root,encoding:'utf8'});

test('agent CLI executes a bounded resource-151 live-snapshot calculation',()=>{
  const result=run('research/examples/theorycraft-installed-snapshot-active.json');
  assert.equal(result.status,0,result.stderr);
  const response=JSON.parse(result.stdout);
  assert.equal(response.result.build,'pc-res151-build51');assert.equal(response.result.preHitDamage,317);assert.equal(response.result.modeledHpLost,267);assert.equal(response.result.finalDamage,null);
});

test('agent CLI loads the actual resource-151 catalogs for preparation',()=>{
  const result=run('research/examples/theorycraft-installed-mouchette-inspection.json');
  assert.equal(result.status,0,result.stderr);
  const response=JSON.parse(result.stdout);
  assert.equal(response.result.build,'pc-res151-build51');assert.equal(response.result.skillId,122483);assert.equal(response.result.prepared.commandId,122499);assert.deepEqual(response.result.prepared.arguments,[15,2]);assert.equal(response.result.execution,null);
});

test('agent CLI composes resource-151 catalog preparation with its bounded snapshot path',()=>{
  const result=run('research/examples/theorycraft-installed-prepared-snapshot-active.json');
  assert.equal(result.status,0,result.stderr);
  const response=JSON.parse(result.stdout);
  assert.equal(response.result.build,'pc-res151-build51');assert.equal(response.result.skillId,3997);assert.equal(response.result.command.id,2350);assert.equal(response.result.calculation.modeledHpLost,1);assert.equal(response.result.finalDamage,null);
});

test('agent CLI rejects resource-151 operations outside the proven dependency graph',()=>{
  const result=run('tests/synthetic/theorycraft-res151-unsupported-operation.json');
  assert.equal(result.status,1);
  const failure=JSON.parse(result.stderr);
  assert.match(failure.message,/outside the proven resource-151 dependency scope/);
});
