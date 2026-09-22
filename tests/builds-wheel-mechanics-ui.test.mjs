import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../website/dist/builds.mjs',import.meta.url),'utf8');
const html=readFileSync(new URL('../website/dist/builds.html',import.meta.url),'utf8');

test('Build planner labels Wheel mechanics as a separate static fingerprint',()=>{
  assert.match(source,/fetch\('wheel-mechanics-capability-catalog\.json'\)/);
  assert.match(source,/Mechanics track fingerprint:/);
  assert.match(source,/does not establish activation, magnitude, timing, legality, stacking, or optimality/);
  assert.match(html,/separate mechanics-track fingerprint/);
  assert.match(html,/static fingerprints do not verify activation, magnitude, team legality or optimality/);
});
