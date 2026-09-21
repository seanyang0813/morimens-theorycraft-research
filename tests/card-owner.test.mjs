import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveCardOwner} from '../engine/card-owner.mjs';

const fixture=JSON.parse(readFileSync(new URL('./synthetic/original-card-owner.json',import.meta.url),'utf8'));
const original=name=>fixture.fixtures.find(row=>row.input.name===name).expected;
const base={schemaVersion:1,kind:'morimens-card-owner',build:'pc-res144-build51',camp:3,skillAwakerId:55,playerUid:100,specialOwnerUid:null,configuredAwakerUid:200,fromCardUid:null,fromCard:null,performSkillId:123};

test('configured Awakener and special owner match original precedence',()=>{
  const configured=resolveCardOwner(base),special=resolveCardOwner({...base,specialOwnerUid:300});
  assert.equal(configured.ownerUid,original('configured-awaker').ownerUid);assert.equal(configured.ownerSource,'configured-awakener');
  assert.equal(special.ownerUid,original('special-owner').ownerUid);assert.equal(special.ownerSource,'special-owner');assert.equal(special.trace.length,1);
});

test('source-card fallback copies owner and perform-skill identity',()=>{
  const result=resolveCardOwner({...base,configuredAwakerUid:null,fromCardUid:999,fromCard:{uid:999,ownerUid:400,performSkillId:777}}),oracle=original('missing-awaker-from-card');
  assert.equal(result.ownerUid,oracle.ownerUid);assert.equal(result.performSkillId,oracle.performSkillId);assert.equal(result.ownerSource,'source-card');
});

test('missing configured Awakener and source card falls back to player',()=>{
  for(const [name,value] of [['missing-awaker-player-fallback',{...base,configuredAwakerUid:null}],['missing-from-card-player-fallback',{...base,configuredAwakerUid:null,fromCardUid:999}]]){
    const result=resolveCardOwner(value);assert.equal(result.ownerUid,original(name).ownerUid);assert.equal(result.ownerSource,'player-fallback');
  }
});

test('non-Awakener skill ignores a supplied special owner',()=>{
  const result=resolveCardOwner({...base,skillAwakerId:null,specialOwnerUid:300});assert.equal(result.ownerUid,original('non-awakener-skill-player').ownerUid);assert.equal(result.ownerSource,'player-non-awakener-skill');
});

test('owner resolver fails closed on ambiguous source-card evidence',()=>{
  for(const value of [{...base,fromCardUid:999,fromCard:{uid:998,ownerUid:400,performSkillId:777}},{...base,playerUid:null},{...base,extra:true}])assert.throws(()=>resolveCardOwner(value));
});
