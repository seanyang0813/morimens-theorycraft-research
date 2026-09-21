import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
test('Android startup Lua inspection proves parsing but no literal resource endpoint',()=>{
  const report=JSON.parse(readFileSync('research/evidence/android-startup-lua-inspection.json','utf8'));
  assert.equal(report.kind,'MORIMENS_ANDROID_STARTUP_LUA_INSPECTION');assert.equal(report.status,'PARSED_WITHOUT_EXECUTION');
  assert.equal(report.sourceHashes.androidStartupArchive,sha(readFileSync('research/raw/android/unpacked/assets/luascript_update.archive')));
  assert.equal(report.prototypeCount,7);assert.equal(report.stringConstantCount,109);assert.equal(report.uniqueStringConstantCount,91);
  assert.deepEqual(report.literalUrlClassification,{total:1,telemetry:1,resourceDownloadCandidates:0});
  assert.match(report.rootSource,/ApusUpdateComp\.lua$/);assert.match(report.scope,/without executing/i);
  assert.ok(report.limitations.some(row=>/dynamically assembled/i.test(row)));assert.ok(report.limitations.some(row=>/no Android\/PC formula parity/i.test(row)));
});
