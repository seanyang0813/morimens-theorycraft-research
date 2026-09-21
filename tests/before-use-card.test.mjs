import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const suite=JSON.parse(readFileSync(new URL('./synthetic/original-before-use-card.json',import.meta.url)));

test('connected before-use fixtures preserve payment, record and event order',()=>{
  assert.equal(suite.fixtures.length,6);
  const byName=Object.fromEntries(suite.fixtures.map(row=>[row.input.name,row.expected]));
  assert.equal(byName['missing-card'].returned,false);
  assert.deepEqual(byName['ordinary-triggered'].trace,['history','boutHistory','energyStats:2.0','record','beforeEvent']);
  assert.equal(byName['ordinary-triggered'].energyAfter,3);
  assert.equal(byName['ordinary-untriggered'].created.length,0);
  assert.equal(byName['attached-triggered'].energyAfter,5);
  assert.equal(byName['forced-free'].created[0].castValue,0);
  assert.equal(byName['x-cost'].energyAfter,0);
  assert.equal(byName['x-cost'].created[0].castValue,5);
});
