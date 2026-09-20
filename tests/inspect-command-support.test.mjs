import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectCommandSupport} from '../engine/inspect-command-support.mjs';
const cmds=JSON.parse(readFileSync(new URL('../research/extracted/config/Cmd.json',import.meta.url)));
test('actual mixed skill retains all blockers and all three effects',()=>{
 const r=inspectCommandSupport({command:cmds[57564]});
 assert.equal(r.rows.length,3);assert.equal(r.executable,false);assert.equal(r.structurallyCompatible,false);
 assert.ok(r.rows[0].blockers.some(b=>b.code==='TARGET_BINDING'));
 assert.ok(r.rows[1].blockers.some(b=>b.value==='BEGainUltiEnergy'));
 assert.ok(r.rows[2].blockers.some(b=>b.value==='BEAddState'));
});
test('terminal-state profile accepts the exact actual three-row shape without dropping effects',()=>{
 const r=inspectCommandSupport({command:cmds[57564],profile:'terminal-self-state',targetExpression:'FrontEnemy'});
 assert.equal(r.structurallyCompatible,true);assert.equal(r.rowCount,3);
 assert.deepEqual(r.rows.map(row=>row.type),['BEActiveDamage','BEGainUltiEnergy','BEAddState']);
 const conditional=JSON.parse(JSON.stringify(cmds[57564]));conditional.data_list['3'].Cond='true';
 assert.ok(inspectCommandSupport({command:conditional,profile:'terminal-self-state',targetExpression:'FrontEnemy'}).rows[2].blockers.some(b=>b.code==='TERMINAL_STATE_CONDITION'));
});
test('syntax compatibility never claims executable; unsupported fields and expressions remain visible',()=>{
 const row={Type:'BEActiveDamage',Target:'UpperTarget',Para:'Arg1'};
 const inspect=r=>inspectCommandSupport({command:{data_list:{1:r}}});
 assert.equal(inspect(row).structurallyCompatible,true);assert.equal(inspect(row).executable,false);
 assert.ok(inspect({...row,DelayTime:0}).rows[0].blockers.some(b=>b.field==='DelayTime'));
 assert.ok(inspect({...row,Cond:'Unknown.Call(1)'}).rows[0].blockers.some(b=>b.code==='EXPRESSION'));
 assert.equal(inspectCommandSupport({command:{data_list:{}}}).structurallyCompatible,false);
 assert.equal(inspectCommandSupport({command:cmds[1849]}).structurallyCompatible,false);
});

test('presentation RNG dependency remains visible for actual VFX command',()=>{
 const r=inspectCommandSupport({command:cmds[1849]});
 assert.ok(r.rows[0].blockers.some(b=>b.code==='PRESENTATION_RNG'));
 assert.ok(r.rows[0].blockers.some(b=>b.field==='VFX'));
 assert.equal(r.executable,false);
});
