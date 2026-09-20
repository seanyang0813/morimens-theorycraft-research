import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolveStateImmunityRules} from '../engine/resolve-state-immunity-rules.mjs';
import {resolveStateImmunity} from '../engine/state-immunity.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url));
const catalog=JSON.parse(read('../research/evidence/state-immunity-catalog.json'));
const properties={immue_buff:0,immue_debuff:0,immue_both_buff:0,immue_state_vulnerable:0,immue_state_weak:0,immue_state_posion:0,immue_state_frail:0};
const run=(stateId,overrides={})=>resolveStateImmunity({stateId,...resolveStateImmunityRules({catalog,stateId,properties:{...properties,...overrides}})});
test('catalog fingerprints and every state classification match exported source data',()=>{
  for(const [file,key] of [['State','StateExport'],['BattleApi','BattleApiExport']])assert.equal(createHash('sha256').update(read(`../research/extracted/config/${file}.json`)).digest('hex'),catalog.sourceHashes[key]);
  const states=JSON.parse(read('../research/extracted/config/State.json'));
  assert.equal(Object.keys(catalog.stateTypes).length,Object.keys(states).length);
  for(const [id,row] of Object.entries(states))assert.equal(catalog.stateTypes[id],({TRUE:'buff',FALSE:'debuff'})[row.IsBuff]??'none');
});
test('actual immunity mappings distinguish untyped trauma, poison, counterattack and both vulnerable IDs',()=>{
  assert.equal(run(80331,{immue_both_buff:1}).immune,false);
  assert.equal(run(3068,{immue_debuff:1}).immune,true);
  assert.equal(run(3905,{immue_buff:1}).immune,true);
  assert.equal(run(3068,{immue_state_posion:1}).immune,true);
  for(const id of [2934,3149])assert.deepEqual(run(id,{immue_state_vulnerable:1}).tipStateIds,[id]);
  assert.equal(run(3469,{immue_state_frail:1}).immune,false);
  assert.equal(run(2564,{immue_state_frail:1}).immune,true);
});
test('unknown state and missing properties fail instead of assuming immunity defaults',()=>{
  assert.throws(()=>resolveStateImmunityRules({catalog,stateId:-123,properties}),/Known/);
  const p={...properties};delete p.immue_state_posion;
  assert.throws(()=>resolveStateImmunityRules({catalog,stateId:3068,properties:p}),/Missing/);
});
