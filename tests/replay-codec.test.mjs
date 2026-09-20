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
