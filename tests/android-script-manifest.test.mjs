import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const python = join(root, '.venv', 'Scripts', 'python.exe');
const tool = join(root, 'tools', 'verify_android_script_group.py');

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'morimens-android-manifest-'));
  const assets = join(dir, 'assets');
  const capture = join(dir, 'capture');
  mkdirSync(assets); mkdirSync(capture);
  writeFileSync(join(assets, 'luascript_update.archive'), 'proof');
  writeFileSync(join(capture, 'share.ab'), 'combat');
  const manifest = {
    versionInfo: {branchName:'test', resVersion:83, buildVersion:54},
    groups: [
      {groupName:'default', items:[{f:'luascript_update.archive',h:'028dce7f598c280ba3697045a8316ce2',s:5,i:83}]},
      {groupName:'Scripts', items:[{f:'share.ab',h:'c222ae0d4e9c59bd254b72521b9e74ed',s:6,i:83}]},
    ],
  };
  const manifestPath = join(assets, '_version.json');
  writeFileSync(manifestPath, JSON.stringify(manifest));
  return {dir, assets, capture, manifestPath};
}

test('Android script capture requires exact manifest size and MD5', () => {
  const f = fixture();
  const output = join(f.dir, 'report.json');
  execFileSync(python, [tool, '--manifest', f.manifestPath, '--capture-dir', f.capture, '--output', output]);
  const report = JSON.parse(readFileSync(output));
  assert.equal(report.manifestHashInterpretation.status, 'DIRECT_ANDROID_MATCH');
  assert.equal(report.capture.status, 'VERIFIED');
  assert.equal(report.scriptGroup.files[0].captureStatus, 'MATCH');
});

test('Android script capture rejects a same-name changed file', () => {
  const f = fixture();
  writeFileSync(join(f.capture, 'share.ab'), 'change');
  const output = join(f.dir, 'report.json');
  const run = spawnSync(python, [tool, '--manifest', f.manifestPath, '--capture-dir', f.capture, '--output', output]);
  assert.equal(run.status, 2);
  const report = JSON.parse(readFileSync(output));
  assert.equal(report.capture.status, 'REJECTED');
  assert.equal(report.scriptGroup.files[0].captureStatus, 'MISMATCH');
});

test('Android persistent-data capture searches only the two recovered download roots',()=>{
  const f=fixture(),persistent=join(f.dir,'persistent'),download=join(persistent,'_game_data_','DownLoad');mkdirSync(download,{recursive:true});
  writeFileSync(join(download,'share.ab'),'combat');
  const output=join(f.dir,'persistent-report.json');
  execFileSync(python,[tool,'--manifest',f.manifestPath,'--persistent-data-root',persistent,'--output',output]);
  const report=JSON.parse(readFileSync(output));
  assert.equal(report.capture.status,'VERIFIED');assert.equal(report.capture.mode,'persistent-data-root');assert.deepEqual(report.capture.searchedChildren,['DownLoad','_game_data_/DownLoad']);
  assert.equal(report.scriptGroup.files[0].sourceRoot,'_game_data_/DownLoad');
  mkdirSync(join(persistent,'DownLoad'),{recursive:true});writeFileSync(join(persistent,'DownLoad','share.ab'),'combat');
  const ambiguous=spawnSync(python,[tool,'--manifest',f.manifestPath,'--persistent-data-root',persistent,'--output',output]);
  assert.equal(ambiguous.status,2);assert.equal(JSON.parse(readFileSync(output)).scriptGroup.files[0].captureStatus,'AMBIGUOUS');
});
