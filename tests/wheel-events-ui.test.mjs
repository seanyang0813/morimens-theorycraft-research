import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../website/dist/wheel-events.html',import.meta.url),'utf8');
const source=readFileSync(new URL('../website/dist/wheel-events.mjs',import.meta.url),'utf8');

test('Wheel event lab exposes every supported transition without presenting a damage result',()=>{
  assert.match(html,/Doomsday example/);assert.match(html,/Light example/);assert.match(html,/Arachne Wheels example/);
  assert.match(html,/does not infer a loadout, create the triggering card, calculate damage, or fill unknown state/);
  assert.match(source,/advanceDoomsdayAfterUseCard/);assert.match(source,/advanceLightOfIntellectAfterKeeperSkill/);assert.match(source,/advanceArachneAfterPursuit/);
  assert.match(source,/finalDamage is/);
});

test('primary workbench pages link to the Wheel event lab',()=>{
  for(const name of ['actions.html','builds.html','index.html','mouchette.html','states.html','timeline.html','rules.html','snapshot.html'])assert.match(readFileSync(new URL('../website/dist/'+name,import.meta.url),'utf8'),/href="wheel-events\.html"/);
});
