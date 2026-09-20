import test from 'node:test';
import assert from 'node:assert/strict';
import {importCommandRows} from '../engine/import-command-rows.mjs';
test('row index determines order; sort metadata retained and behavioral fields preserved',()=>{
 const command={data_list:{3:{BaseSortID:200,Type:'C'},1:{BaseSortID:300,Type:'A',DelayTime:0},2:{BaseSortID:100,Type:'B',VFX:{1:22}}}};
 const r=importCommandRows(command);
 assert.deepEqual(r.rows.map(r=>r.Type),['A','B','C']);
 assert.deepEqual(r.metadata.map(r=>r.BaseSortID),[300,100,200]);
 assert.equal(r.rows[0].DelayTime,0);assert.equal(r.rows[1].VFX[1],22);
 r.rows[1].VFX[1]=99;assert.equal(command.data_list[2].VFX[1],22);
});
test('sparse or malformed row identities are not silently reordered into a different command',()=>{
 for(const data_list of [{2:{}},{1:{},3:{}},{'01':{}},{x:{}}])assert.throws(()=>importCommandRows({data_list}),/Contiguous/);
 assert.throws(()=>importCommandRows({data_list:{1:{id:'override'}}}),/synthetic/);
});
