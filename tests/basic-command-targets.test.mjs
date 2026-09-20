import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectBasicCommandTargets} from '../engine/basic-command-targets.mjs';
test('four basic selectors match 72 original results and ordered lookups',()=>{
 const fixtures=JSON.parse(readFileSync(new URL('./synthetic/original-basic-targets.json',import.meta.url))).fixtures;
 assert.equal(fixtures.length,72);
 for(const {input:v,expected} of fixtures){
  const r=selectBasicCommandTargets({selector:v.selector,casterUid:11,lastEffectUid:22,upperTargets:v.upperTargets,getRole:()=>v.caster,getPlayer:()=>v.player,getCasterCamp:()=>1,getEffect:()=>v.effectExists?{targets:v.lastTargets}:null});
  assert.deepEqual(r,expected);
 }
});
test('selectors preserve target references and distinguish missing input from known absence',()=>{
 const target={uid:1},list=[target];
 assert.equal(selectBasicCommandTargets({selector:'UpperTarget',upperTargets:list}).targets,list);
 assert.equal(selectBasicCommandTargets({selector:'LastTarget',lastEffectUid:2,getEffect:()=>({targets:list})}).targets,list);
 assert.deepEqual(selectBasicCommandTargets({selector:'CmdCaster',casterUid:1,getRole:()=>null}).targets,[]);
 assert.throws(()=>selectBasicCommandTargets({selector:'CmdCaster',casterUid:1,getRole:()=>undefined}),/Unresolved/);
 assert.throws(()=>selectBasicCommandTargets({selector:'FrontEnemy'}),/Unsupported/);
});
