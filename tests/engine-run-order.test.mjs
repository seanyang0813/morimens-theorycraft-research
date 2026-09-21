import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const suite=JSON.parse(readFileSync(new URL('./synthetic/original-engine-run-order.json',import.meta.url)));

test('engine order fixtures cover resume, finish, wave, forced-bout and PvP branches',()=>{
  assert.equal(suite.fixtures.length,7);
  const byName=Object.fromEntries(suite.fixtures.map(row=>[row.input.name,row.expected]));
  assert.equal(byName['pve-complete'].trace[0],'beginRecord');
  assert.equal(byName['pve-complete'].trace.at(-1),'afterFinished');
  assert.equal(byName['resume-incomplete'].trace.some(item=>item?.event==='createOrder'),false);
  assert.equal(byName['already-finished'].trace.includes('updateCardArgs'),false);
  assert.equal(byName['already-finished'].trace.at(-1),'onBattleFinish');
  assert.equal(byName['battle-over-complete'].trace.at(-1),'runBattleEnd');
  assert.equal(byName['force-end-bout'].trace.at(-1),'endBout');
  assert.deepEqual(byName['pvp-complete'].trace.filter(item=>typeof item==='string'&&item.startsWith('getPlayer:')),['getPlayer:1','getPlayer:2']);
  assert.equal(byName['battle-over-incomplete'].trace.includes('afterFinished'),false);
  for(const row of suite.fixtures)assert.equal(row.expected.pendingAfter,false);
});
