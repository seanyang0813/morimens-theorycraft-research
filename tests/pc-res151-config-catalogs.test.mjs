import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync('research/evidence/pc-res150-to-res151-config-catalogs.json','utf8'));

test('resource 151 replay-adapter catalogs are Lua-semantically equivalent to resource 150',()=>{
  assert.equal(report.kind,'MORIMENS_PC_CONFIG_CATALOG_COMPARISON');
  assert.equal(report.beforeBuild,'pc-res150-build51');
  assert.equal(report.afterBuild,'pc-res151-build51');
  assert.equal(report.status,'LUA_SEMANTICALLY_EQUIVALENT');
  assert.deepEqual(report.tables.map(row=>row.name),['Skill','Cmd','State','BattleApi','Constant']);
  assert.equal(report.summary.tableCount,5);
  assert.equal(report.summary.luaSemanticallyEquivalentTables,5);
  assert.equal(report.summary.addedRows,0);
  assert.equal(report.summary.removedRows,0);
  assert.equal(report.summary.luaSemanticChangedSharedRows,0);
  assert.equal(report.summary.representationOnlyChangedRows,1);
  for(const row of report.tables){
    assert.match(row.beforeRawSha256,/^[a-f0-9]{64}$/);
    assert.match(row.afterRawSha256,/^[a-f0-9]{64}$/);
    assert.match(row.beforeCanonicalSha256,/^[a-f0-9]{64}$/);
    assert.equal(row.beforeCanonicalSha256,row.afterCanonicalSha256);
    assert.equal(row.luaSemanticEquivalent,true);
  }
});
