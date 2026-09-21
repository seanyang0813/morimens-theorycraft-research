import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deriveSnapshotBlockInput} from '../engine/snapshot-block-context.mjs';
import {calculateBlockGain} from '../engine/block-gain.mjs';

const fixture=JSON.parse(readFileSync(new URL('./synthetic/original-connected-block-calculation.json',import.meta.url)));

test('snapshot-derived ordinary PvE Defend Block matches connected original GetRealBlock',()=>{
  assert.equal(fixture.fixtures.length,256);
  for(const row of fixture.fixtures){
    const v=row.input,derived=deriveSnapshotBlockInput({skillTags:v.skillTags,casterProperties:v.casterProperties,playerProperties:v.playerProperties,cardProperties:v.cardProperties,targetProperties:{...v.targetProperties,block:0,max_hp:1e12,block_max_per:0},skillArgsPlus:v.skillArgsPlus});
    const result=calculateBlockGain({base:v.base,modifiers:derived.modifiers,target:derived.target,storage:derived.storage});
    assert.equal(result.requestedBlock,row.expected.value);
    const derivedReads=new Set(derived.reads.map(item=>`${item.owner}:${item.property}`));
    for(const read of row.expected.propertyReads)assert.ok(derivedReads.has(`${read.owner}:${read.property}`),`missing derived ownership for ${read.owner}:${read.property}`);
  }
});
