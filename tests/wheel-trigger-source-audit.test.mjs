import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const report=JSON.parse(readFileSync(new URL('../research/evidence/recovered-wheel-trigger-audit.json',import.meta.url),'utf8'));

test('sanitized source audit pins the recovered Wheel transition boundaries',()=>{
  assert.equal(report.status,'SOURCE_ROWS_MATCH_EXPECTED_TRANSITIONS');
  assert.deepEqual(report.summary,{checks:14,passed:14,doomsdayCounterCap:8,lightCounterCap:1,maxRefinementLightChancePercent:100,arachneCounterCapPerWheel:5,maxRefinementDoomsdayFlatPercent:25,maxRefinementEternalAmplification:40,maxRefinementRotaAmplification:15,eternalSecondCommandRegistered:false});
  assert.equal(report.checks.length,14);
  assert.match(report.source.StateSha256,/^[0-9a-f]{64}$/);
  assert.match(report.source.CmdSha256,/^[0-9a-f]{64}$/);
  assert.match(report.source.BattleStateServerSha256,/^[0-9a-f]{64}$/);
});
