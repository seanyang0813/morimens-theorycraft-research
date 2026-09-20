import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const catalog=JSON.parse(fs.readFileSync(new URL('../research/evidence/replay-protocol.json',import.meta.url),'utf8'));
test('replay protocol catalog retains unique required command and event IDs',()=>{
  assert.equal(catalog.build,'pc-res144-build51');
  for(const name of ['rd_InitBattle','rd_BattleCut','rd_BattleInstantCut','rd_CommandResult'])assert.equal(Number.isSafeInteger(catalog.commands[name]),true,name);
  for(const name of ['UseCard','AddState','ChangeStateLayer','DelState','BeHit','PropertyChanged','SelectTargets'])assert.equal(Number.isSafeInteger(catalog.renderEvents[name]),true,name);
  assert.equal(new Set(Object.values(catalog.commands)).size,Object.keys(catalog.commands).length);
  assert.equal(new Set(Object.values(catalog.renderEvents)).size,Object.keys(catalog.renderEvents).length);
});
