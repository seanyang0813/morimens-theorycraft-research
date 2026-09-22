import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('Android XLua URL bridge receives its base string from Lua and only normalizes it',()=>{
  const report=JSON.parse(readFileSync('research/evidence/android-url-bridge-inspection.json','utf8'));
  assert.equal(report.kind,'MORIMENS_ANDROID_URL_BRIDGE_INSPECTION');
  assert.equal(report.status,'LUA_SUPPLIED_URL_NORMALIZER_CONFIRMED');
  assert.equal(report.sourceHashes.globalMetadata,sha(readFileSync('research/raw/android/unpacked/assets/bin/Data/Managed/Metadata/global-metadata.dat')));
  assert.equal(report.sourceHashes.libil2cpp,sha(readFileSync('research/raw/android/unpacked/lib/arm64-v8a/libil2cpp.so')));
  assert.equal(report.xluaBridge.input.api,'XLua.Lua.lua_tostring');assert.equal(report.xluaBridge.input.luaStackIndex,1);
  assert.equal(report.xluaBridge.managedCall.api,'ResourceManager.DownloadHelper.FixUrlRoot');
  assert.equal(report.xluaBridge.output.api,'XLua.Lua.lua_pushstring');assert.equal(report.xluaBridge.output.luaReturnValues,1);
  assert.equal(report.normalization.firstCall.api,'ResourceManager.DownloadHelper.FixPath');
  assert.equal(report.normalization.suffixCheck.literal.value,'/');
  assert.equal(report.normalization.missingSuffixAction.appendedLiteral,'/');
  assert.equal(report.normalization.hostOrSchemeLiteralIntroduced,false);
  assert.equal(report.startupLuaCrossCheck.resourceDownloadCandidates,0);
  assert.match(report.nextEvidenceNeeded,/Scripts group|download trees/i);
});
