import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('Android Lua bundles use a recovered download, AAB, then StreamingAssets lookup order',()=>{
  const report=JSON.parse(readFileSync('research/evidence/android-lua-bundle-loader-inspection.json','utf8'));
  assert.equal(report.kind,'MORIMENS_ANDROID_LUA_BUNDLE_LOADER_INSPECTION');
  assert.equal(report.status,'STATIC_LUA_BUNDLE_LOOKUP_ORDER_RECOVERED');
  assert.equal(report.sourceHashes.globalMetadata,sha(readFileSync('research/raw/android/unpacked/assets/bin/Data/Managed/Metadata/global-metadata.dat')));
  assert.equal(report.sourceHashes.libil2cpp,sha(readFileSync('research/raw/android/unpacked/lib/arm64-v8a/libil2cpp.so')));
  assert.deepEqual(report.startupBundleSequence.baseBundles.map(item=>item.file),[
    'gamelauncher.ab','config.ab','foundation.ab','gamescript.ab','share.ab','vue.ab','ejoysdk_lua.ab',
  ]);
  assert.equal(report.startupBundleSequence.manifestExactSetMatch,true);
  assert.equal(report.startupBundleSequence.languageBundle.position,'after all base bundles');
  assert.equal(report.startupBundleSequence.languageBundle.emptyOrCn,'text_cn.ab');
  assert.deepEqual(report.bundleFileLookupOrder.map(item=>item.source),[
    'download override','Android App Bundle file-system mapping','packaged StreamingAssets fallback',
  ]);
  assert.match(report.bundleFileLookupOrder[0].path,/GetDownloadPathDefault/);
  assert.match(report.bundleFileLookupOrder[1].path,/TryGetFile/);
  assert.match(report.bundleFileLookupOrder[2].path,/streamingAssetsPath/);
  assert.equal(report.luaModuleResolution.bundleKey,"substring before the first '/', lowercased");
  assert.equal(report.luaModuleResolution.assetPath,'Assets/Lua/ + transformed module filename + .bytes');
  assert.equal(report.updaterBootstrapLoader.reader,'ResourceManager.DownloadHelper.LoadLuaFileAllBytes');
  assert.match(report.nextEvidenceNeeded,/gamescript\.ab/);
  assert.ok(report.limitations.some(item=>/gameplay validation or holdout credit/i.test(item)));
});
