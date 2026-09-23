import test from 'node:test';
import assert from 'node:assert/strict';
import {startSnapshotCalculator} from '../website/dist/snapshot.mjs';
import {calculateSnapshotActiveDamage} from '../engine/battle-property-snapshot-damage.mjs';
import {calculateSnapshotActiveBranches} from '../engine/snapshot-active-branches.mjs';
import {runSnapshotActiveSequence} from '../engine/snapshot-active-sequence.mjs';

test('property snapshot UI renders single hits, sequences and invalid input',()=>{
  class Element{constructor(){this.children=[];this.textContent='';this.value='';this.hidden=false;}replaceChildren(...items){this.children=items;}click(){this.onclick();}}
  const nodes=new Map(),doc={getElementById(id){if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);},createElement(){return new Element();}};
  startSnapshotCalculator({calculateSnapshotActiveDamage,calculateSnapshotActiveBranches,runSnapshotActiveSequence,runtimeFingerprint:'a'.repeat(64)},doc);
  nodes.get('example').onclick();
  assert.equal(JSON.parse(nodes.get('input').value).build,'pc-res151-build51');
  assert.equal(nodes.get('metric-one-label').textContent,'Pre-hit damage');assert.equal(nodes.get('total').textContent,'317');assert.equal(nodes.get('hp-loss').textContent,'267');assert.equal(nodes.get('reads').children.length,79);
  assert.match(nodes.get('summary').textContent,/pc-res151-build51/);
  nodes.get('chance-example').onclick();
  assert.equal(nodes.get('metric-one-label').textContent,'Non-critical / critical pre-hit damage');
  assert.match(nodes.get('hp-loss').textContent,/12%/);
  assert.match(nodes.get('summary').textContent,/actual RNG draw unknown/);
  nodes.get('sequence-example').onclick();
  assert.equal(JSON.parse(nodes.get('input').value).build,'pc-res151-build51');
  assert.equal(nodes.get('metric-one-label').textContent,'Total modeled HP loss');assert.equal(nodes.get('total').textContent,'150');assert.equal(nodes.get('hp-loss').textContent,'2 / 2');assert.match(nodes.get('summary').textContent,/1000 HP \/ 150 Block → 850 HP \/ 0 Block/);
  nodes.get('input').value='bad';nodes.get('run').onclick();assert.equal(nodes.get('result').hidden,true);assert.ok(nodes.get('error').textContent);
});
