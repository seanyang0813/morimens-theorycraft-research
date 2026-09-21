import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('packaged Android update bundle has complete serialized-field endpoint scan',()=>{
  const report=JSON.parse(readFileSync('research/evidence/android-bootstrap-inspection.json','utf8'));
  assert.equal(report.compatibilityDecode.status,'PARSED_CONTAINER');assert.equal(report.compatibilityDecode.textAssetCount,0);
  assert.deepEqual(report.compatibilityDecode.serializedFieldScan,{readableMonoBehaviours:130,failedMonoBehaviours:0,stringFields:428,nonemptyStringFields:191,literalHttpUrls:0,nonemptyEndpointNamedFields:0});
  assert.match(report.compatibilityDecode.scope,/No combat script/);assert.match(report.nextEvidenceNeeded,/downloaded Android combat\/config bundles/);
});
