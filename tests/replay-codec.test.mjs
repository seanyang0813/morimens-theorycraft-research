import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';

const hasClient=existsSync('research/raw/pc/Morimens_Data/Plugins/x86_64/xlua.dll');
test('copied client LZ4 and MessagePack codecs decode a nested synthetic replay',{skip:!hasClient},()=>{
  const code=`from tools.replay_codec import ReplayCodec\nc=ReplayCodec();d=c.decode(c.synthetic_fixture());import json;print(json.dumps(d,separators=(',',':')))\n`;
  const run=spawnSync('python',['-c',code],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);
  const data=JSON.parse(run.stdout);assert.equal(data.battleDat.stageId,42);assert.equal(data.unZippedRecord.length,1);assert.equal(data.unZippedRecord[0].msgData.frameList[0].data.value,99);assert.equal(Object.hasOwn(data,'recordZips'),false);
});

test('replay container parser requires the real binary JSON convention explicitly',()=>{
  const code=`from pathlib import Path\nfrom tempfile import TemporaryDirectory\nfrom tools.replay_codec import container_compstr\nwith TemporaryDirectory() as d:\n p=Path(d)/'replay.json';p.write_bytes(b'{"compStr":"\\u0004'+bytes([0xc0,0xff])+b'"}')\n try: container_compstr(p,'latin1')\n except UnicodeDecodeError: pass\n else: raise AssertionError('UTF-8 default accepted binary JSON')\n assert container_compstr(p,'latin1','latin1')==bytes([4,0xc0,0xff])\n`;
  const run=spawnSync('python',['-c',code],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);
});
