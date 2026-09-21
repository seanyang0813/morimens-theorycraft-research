import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const suite=JSON.parse(readFileSync(new URL('./synthetic/original-engine-use-card.json',import.meta.url)));

test('engine use-card fixtures preserve rejection, target and success boundaries',()=>{
  assert.equal(suite.fixtures.length,6);
  const byName=Object.fromEntries(suite.fixtures.map(row=>[row.input.name,row.expected]));
  assert.deepEqual(byName['missing-card'].return,[false,1]);
  assert.equal(byName['missing-card'].canUseArgs.length,0);
  assert.equal(byName['server-target-success'].finalTargets,null);
  assert.deepEqual(byName['server-target-denied'].return,[false,77]);
  assert.equal(byName['client-no-object'].finalTargets,'original');
  assert.equal(byName['client-replaced'].finalTargets,'replacement');
  assert.equal(byName['client-replaced'].commandResults[0].hand,'hand');
  assert.deepEqual(byName['camp1-play-limit'].trace,['forcedBoutEnd']);
});
