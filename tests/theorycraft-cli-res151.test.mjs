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

test('agent CLI resolves installed-client character advancement from pinned data',()=>{
  const result=run('research/examples/theorycraft-installed-mouchette-primary.json');
  assert.equal(result.status,0,result.stderr);
  const response=JSON.parse(result.stdout);
  assert.equal(response.result.build,'pc-res151-build51');
  assert.equal(response.result.baseStats.ATK,198);
  assert.equal(response.result.stats.ATK,258);
  assert.equal(response.result.finalDamage,null);
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

test('agent CLI runs resource-151 ultimate-energy calculation and capped storage',()=>{
  const result=run('research/examples/theorycraft-installed-ulti-energy.json');
  assert.equal(result.status,0,result.stderr);
  const response=JSON.parse(result.stdout);
  assert.equal(response.result.build,'pc-res151-build51');assert.equal(response.result.targetsAfter[0].energy,100);assert.equal(response.result.finalDamage,null);
  assert.ok(response.result.unresolvedDependencies.some(value=>value.includes('516 inherited fixtures')));
});

test('agent CLI prepares and executes the bounded resource-151 Defend Block and energy path',()=>{
  const result=run('research/examples/theorycraft-installed-prepared-snapshot-block-skill.json');
  assert.equal(result.status,0,result.stderr);
  const response=JSON.parse(result.stdout);
  assert.equal(response.result.build,'pc-res151-build51');assert.equal(response.result.command.id,834);assert.equal(response.result.block.blockAfter,10);assert.equal(response.result.energy.targetsAfter[0].energy,100);assert.equal(response.result.finalDamage,null);
});

test('agent CLI carries a resource-151 catalog state into a prepared Active hit',()=>{
  const result=run('research/examples/theorycraft-installed-prepared-state-active-sequence.json');
  assert.equal(result.status,0,result.stderr);
  const response=JSON.parse(result.stdout);
  assert.equal(response.result.build,'pc-res151-build51');assert.equal(response.result.carry.activeCasterProperties.crit_damage,105);assert.equal(response.result.modeledHpLost,3);assert.equal(response.result.targetAfter.hp,997);assert.equal(response.result.finalDamage,null);
});

test('agent CLI carries a resource-151 catalog state through five prepared Active hits',()=>{
  const result=run('research/examples/theorycraft-installed-prepared-state-active-chain.json');
  assert.equal(result.status,0,result.stderr);
  const response=JSON.parse(result.stdout);
  assert.equal(response.result.build,'pc-res151-build51');assert.equal(response.result.executedActions,5);assert.equal(response.result.modeledHpLost,15);assert.equal(response.result.targetAfter.hp,985);assert.equal(response.result.finalDamage,null);
});

test('agent CLI pays for the resource-151 state card and five prepared Active hits',()=>{
  const result=run('research/examples/theorycraft-installed-paid-prepared-state-active-chain.json');
  assert.equal(result.status,0,result.stderr);
  const response=JSON.parse(result.stdout);
  assert.equal(response.result.build,'pc-res151-build51');assert.equal(response.result.acceptedCards,6);assert.equal(response.result.energyAfter,0);assert.equal(response.result.modeledHpLost,15);assert.equal(response.result.targetAfter.hp,985);assert.equal(response.result.finalDamage,null);
});

test('agent CLI derives and pays a resource-151 two-card Arachne Wheel timeline',()=>{
  const result=run('research/examples/theorycraft-installed-prepared-paid-wheel-active-timeline.json');
  assert.equal(result.status,0,result.stderr);
  const response=JSON.parse(result.stdout);
  assert.equal(response.result.build,'pc-res151-build51');assert.equal(response.result.preparedActions.length,2);assert.equal(response.result.energyAfter,0);assert.equal(response.result.modeledHpLost,139);assert.equal(response.result.calculation.trace[0].effect.trace.at(-1).result.ownerAttackSourceProperty,'AtkForce');assert.equal(response.result.finalDamage,null);
});

test('agent CLI exposes installed Fixed pre-hit arithmetic without final damage',()=>{
  const result=run('research/examples/theorycraft-installed-fixed-prehit.json');
  assert.equal(result.status,0,result.stderr);
  const response=JSON.parse(result.stdout);
  assert.equal(response.result.build,'pc-res151-build51');
  assert.equal(response.result.experimentalModels[0].preHitDamage,150);
  assert.equal(response.result.finalDamage,null);
  assert.ok(response.result.evidence.includes('research/evidence/pc-res151-fixed-pure-runtime.json'));
});

test('agent CLI rejects resource-151 resolved damage without a supported category',()=>{
  const result=run('tests/synthetic/theorycraft-res151-unsupported-operation.json');
  assert.equal(result.status,1);
  const failure=JSON.parse(result.stderr);
  assert.match(failure.message,/limited to Fixed\/Pure\/Tentacle pre-hit effects/);
});

test('agent CLI exposes installed Tentacle pre-hit arithmetic without final damage',()=>{
  const result=run('research/examples/theorycraft-installed-tentacle-prehit.json');
  assert.equal(result.status,0,result.stderr);
  const response=JSON.parse(result.stdout);
  assert.equal(response.result.build,'pc-res151-build51');
  assert.equal(response.result.experimentalModels[0].preHitDamage,120);
  assert.equal(response.result.finalDamage,null);
  assert.ok(response.result.evidence.includes('tests/synthetic/installed-tentacle-prehit.json'));
});
