import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('configured rebirth and unattached threshold paths remain separate',()=>{
  const report=JSON.parse(readFileSync(new URL('../research/evidence/ghost-dog-phase-variants.json',import.meta.url),'utf8'));
  assert.equal(report.analysisTrack,'mechanics');assert.equal(report.status,'EXACT_SELECTED_CATALOG_MATCH');assert.equal(report.normalizedMatches.length,5);
  assert.deepEqual(report.rows.MonsterConfig['60097'].ExistState,{'1':60564,'2':45210});
  assert.deepEqual(report.monsterConfigPhaseStateReferences,{'60409':[],'60408':[]});
  const command=report.rows.Cmd['60563'].data_list;
  assert.deepEqual([command['2'].Para,command['2'].Type,command['2'].Cond],[60397,'BEMonsterChangeSkill','UpperTarget.GetStateLayer(44806)==0']);
  assert.deepEqual([command['3'].Para,command['3'].Type,command['3'].Cond],[60398,'BEMonsterChangeSkill','UpperTarget.GetStateLayer(44806)==1']);
});
