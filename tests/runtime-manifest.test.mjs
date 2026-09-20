import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyRuntimeManifest} from '../tools/verify_runtime_manifest.mjs';
test('prepared runtime matches every allowlisted authored engine and packaged data hash',()=>{
  assert.match(verifyRuntimeManifest(),/^[a-f0-9]{64}$/);
});
