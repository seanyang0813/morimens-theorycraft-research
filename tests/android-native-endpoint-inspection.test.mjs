import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const root='research/raw/android/unpacked/lib/arm64-v8a/';

test('Android native endpoint audit binds every packaged ARM64 library and publishes no endpoint values',()=>{
  const report=JSON.parse(readFileSync('research/evidence/android-native-endpoint-inspection.json','utf8'));
  assert.equal(report.kind,'MORIMENS_ANDROID_NATIVE_ENDPOINT_INSPECTION');
  assert.equal(report.status,'NO_LITERAL_RESOURCE_DOWNLOAD_ENDPOINT_FOUND');
  assert.deepEqual(report.input,{abi:'arm64-v8a',libraryCount:3,minimumStringLength:4,maximumStringLength:4096,encodings:['ASCII','UTF-16LE']});
  assert.deepEqual(report.summary.classifications,{standards:1,documentation:3,localhost:0,malformedOrNonDns:43,markupFragment:7,resourceDownloadCandidate:0,otherExternal:0});
  assert.equal(report.summary.literalUrls,54);assert.equal(report.summary.distinctUrlCommitments,54);
  for(const row of report.libraries){
    assert.equal(row.sha256,sha(readFileSync(root+row.name)));
    assert.equal(row.literalUrls.resourceCandidateSha256Commitments.length,0);
  }
  assert.deepEqual(report.libraries.map(row=>row.name),['libil2cpp.so','libtuanjie.so','libxlua.so']);
  assert.equal(report.privacy.publishedEndpointValues,0);
  assert.match(report.privacy.privateInventorySha256,/^[0-9a-f]{64}$/);
  assert.ok(report.limitations.some(value=>/does not supply Android combat bundles/i.test(value)));
});
