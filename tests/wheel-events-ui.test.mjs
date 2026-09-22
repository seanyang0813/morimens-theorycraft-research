import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {startWheelEventLab} from '../website/dist/wheel-events.mjs';
import {compareWheelActiveTimelines} from '../engine/wheel-active-comparison.mjs';
import {runWheelActiveTimeline} from '../engine/wheel-active-timeline.mjs';
import {runWheelEventSequence} from '../engine/wheel-event-sequence.mjs';
import {advanceDoomsdayAfterUseCard,advanceLightOfIntellectAfterKeeperSkill,advanceArachneAfterPursuit} from '../engine/wheel-trigger-transitions.mjs';

const html=readFileSync(new URL('../website/dist/wheel-events.html',import.meta.url),'utf8');
const source=readFileSync(new URL('../website/dist/wheel-events.mjs',import.meta.url),'utf8');

test('Wheel event lab exposes every supported transition and bounded damage composition',()=>{
  assert.match(html,/Wheel \+ damage example/);assert.match(html,/Ordered sequence example/);assert.match(html,/Doomsday example/);assert.match(html,/Light example/);assert.match(html,/Arachne Wheels example/);
  assert.match(html,/does not infer a loadout, create triggering cards, emit events automatically, or fill unknown state/);
  assert.match(source,/advanceDoomsdayAfterUseCard/);assert.match(source,/advanceLightOfIntellectAfterKeeperSkill/);assert.match(source,/advanceArachneAfterPursuit/);
  assert.match(source,/runWheelEventSequence/);assert.match(source,/AFTER_BOUT_END/);
  assert.match(source,/runWheelActiveTimeline/);assert.match(source,/morimens-wheel-active-timeline/);
  assert.match(html,/Pin timeline/);assert.match(html,/Compare with pin/);assert.match(source,/compareWheelActiveTimelines/);assert.match(source,/orderOnly/);
  assert.match(source,/finalDamage is/);
});

test('primary workbench pages link to the Wheel event lab',()=>{
  for(const name of ['actions.html','builds.html','index.html','mouchette.html','states.html','timeline.html','rules.html','snapshot.html'])assert.match(readFileSync(new URL('../website/dist/'+name,import.meta.url),'utf8'),/href="wheel-events\.html"/);
});

test('Wheel event lab pins and compares a reordered damage timeline',()=>{
  class Element{constructor(){this.textContent='';this.value='';this.hidden=false;}}
  const nodes=new Map(),doc={getElementById(id){if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);}};
  startWheelEventLab({compareWheelActiveTimelines,runWheelActiveTimeline,runWheelEventSequence,advanceDoomsdayAfterUseCard,advanceLightOfIntellectAfterKeeperSkill,advanceArachneAfterPursuit,runtimeFingerprint:'a'.repeat(64)},doc);
  nodes.get('damage').onclick();let result=JSON.parse(nodes.get('output').textContent);assert.equal(result.kind,'morimens-wheel-active-timeline-result');assert.equal(result.modeledHpLost,855);
  nodes.get('pin').onclick();assert.match(nodes.get('pin-status').textContent,/Pinned 5 steps/);
  const candidate=JSON.parse(nodes.get('input').value);candidate.steps=[candidate.steps[0],candidate.steps[2],candidate.steps[1],candidate.steps[3],candidate.steps[4]];nodes.get('input').value=JSON.stringify(candidate);nodes.get('compare').onclick();
  result=JSON.parse(nodes.get('output').textContent);assert.equal(result.kind,'morimens-wheel-active-comparison-result');assert.equal(result.orderOnly,true);assert.equal(result.modeledHpLostDelta,-250);assert.equal(result.reproducibility,'RUNTIME_PINNED');
  nodes.get('input').value=JSON.stringify({kind:'wrong'});nodes.get('compare').onclick();assert.equal(nodes.get('result').hidden,true);assert.match(nodes.get('error').textContent,/candidate/);
});
