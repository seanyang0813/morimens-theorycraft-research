import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../website/dist/wheel-events.html',import.meta.url),'utf8');
const source=readFileSync(new URL('../website/dist/wheel-events.mjs',import.meta.url),'utf8');

test('Wheel event lab exposes every supported transition and bounded damage composition',()=>{
  assert.match(html,/Wheel \+ damage example/);assert.match(html,/Ordered sequence example/);assert.match(html,/Doomsday example/);assert.match(html,/Light example/);assert.match(html,/Arachne Wheels example/);
  assert.match(html,/does not infer a loadout, create triggering cards, emit events automatically, or fill unknown state/);
  assert.match(source,/advanceDoomsdayAfterUseCard/);assert.match(source,/advanceLightOfIntellectAfterKeeperSkill/);assert.match(source,/advanceArachneAfterPursuit/);
  assert.match(source,/runWheelEventSequence/);assert.match(source,/AFTER_BOUT_END/);
  assert.match(source,/runWheelActiveTimeline/);assert.match(source,/morimens-wheel-active-timeline/);
  assert.match(source,/finalDamage is/);
});

test('primary workbench pages link to the Wheel event lab',()=>{
  for(const name of ['actions.html','builds.html','index.html','mouchette.html','states.html','timeline.html','rules.html','snapshot.html'])assert.match(readFileSync(new URL('../website/dist/'+name,import.meta.url),'utf8'),/href="wheel-events\.html"/);
});
