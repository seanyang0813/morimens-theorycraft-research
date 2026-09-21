import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
test('Android IL2CPP update inventory recovers a relative download tree without inventing an endpoint',()=>{
  const report=JSON.parse(readFileSync('research/evidence/android-il2cpp-update-inspection.json','utf8'));
  assert.equal(report.kind,'MORIMENS_ANDROID_IL2CPP_UPDATE_INSPECTION');assert.equal(report.status,'STATIC_UPDATE_SURFACE_RECOVERED');
  assert.equal(report.sourceHashes.globalMetadata,sha(readFileSync('research/raw/android/unpacked/assets/bin/Data/Managed/Metadata/global-metadata.dat')));
  assert.equal(report.sourceHashes.libil2cpp,sha(readFileSync('research/raw/android/unpacked/lib/arm64-v8a/libil2cpp.so')));
  assert.deepEqual(report.metadata,{version:31,stringLiteralCount:17688,stringLiteralDataBytes:473336});
  assert.deepEqual(report.literalUrlClassification,{total:30,standards:26,documentation:3,localhost:1,resourceDownloadCandidates:0});
  assert.equal(report.downloadStorageEvidence.persistentRootSource.callee,'UnityEngine.Application.get_persistentDataPath');
  assert.equal(report.downloadStorageEvidence.defaultDirectory.secondArgument.value,'DownLoad');
  assert.equal(report.downloadStorageEvidence.relativeDirectory.returnValue.value,'_game_data_/DownLoad');
  assert.equal(report.downloadStorageEvidence.resourcePathTemplate,'/_game_data_/DownLoad/{0}');
  assert.ok(report.downloadStorageEvidence.artifactNames.includes('_version.json'));assert.ok(report.downloadStorageEvidence.artifactNames.includes('patches_info.json'));
  assert.ok(report.managedUpdateSurface.methods.some(row=>row.signature.includes('GetDownloadRelativePath')));
  assert.match(report.nextEvidenceNeeded,/Application\.persistentDataPath/);assert.ok(report.limitations.some(row=>/formula parity is not established/i.test(row)));
});
