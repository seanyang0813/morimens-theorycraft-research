import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateCommandDelays} from '../engine/command-delays.mjs';
test('delay planning matches 96 original executions including retroactive clamping',()=>{
 const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-command-delays.json',import.meta.url)));
 assert.equal(evidence.fixtures.length,96);
 for(const {input,expected} of evidence.fixtures)assert.deepEqual(calculateCommandDelays(input),expected);
});
test('unresolved cast time fails; numeric zero is preserved and pre-commands skip lookup',()=>{
 const base={delays:[null],preCommand:false,executeCommand:false,castTimes:{}};
 assert.throws(()=>calculateCommandDelays(base),/Unresolved/);
 assert.deepEqual(calculateCommandDelays({...base,delays:[0]}),{delays:[0],castTimeReads:[]});
 assert.deepEqual(calculateCommandDelays({...base,preCommand:true}),{delays:[0],castTimeReads:[]});
 assert.throws(()=>calculateCommandDelays({...base,delays:['0x10']}),/Hexadecimal/);
});
