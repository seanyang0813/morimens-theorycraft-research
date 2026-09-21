import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const suite=JSON.parse(readFileSync(new URL('./synthetic/original-after-use-card.json',import.meta.url)));

test('after-use fixtures preserve deck, stats, events and cleanup boundaries',()=>{
  assert.equal(suite.fixtures.length,8);
  const byName=Object.fromEntries(suite.fixtures.map(row=>[row.input.name,row.expected]));
  assert.equal(byName['missing-card'].returned,false);
  assert.equal(byName['explicit-deck'].trace.includes('move:99.0'),true);
  assert.equal(byName['awake-deck'].trace.includes('move:AwakeDeck'),true);
  assert.equal(byName['consumed-deck'].trace.includes('move:ConsumedDeck'),true);
  assert.deepEqual(byName['attached-deck-events'].events.map(row=>row.kind),['after','attach']);
  assert.equal(byName['grave-no-trigger'].events.length,0);
  assert.deepEqual(byName['strike-stats'].stats,[{key:'UsedCardCount',value:3},{key:'StrikeCardUsedCount',value:1}]);
  assert.deepEqual(byName['effect-end'].trace.slice(-3),['clearTargets','clearCurCard','afterAction:2.0']);
});
