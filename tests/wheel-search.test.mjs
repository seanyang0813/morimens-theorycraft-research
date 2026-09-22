import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {searchWheelCatalog} from '../engine/wheel-search.mjs';

const catalog=JSON.parse(readFileSync(new URL('../website/dist/build-catalog.json',import.meta.url)));
const query=patch=>({catalogRevision:catalog.source.revision,query:'',characterId:null,ownerMatchOnly:false,tags:[],realms:[],mainstatKeys:[],limit:catalog.wheels.length,...patch});

test('Wheel catalog search supports owner, tag and property discovery without ranking',()=>{
  const mouchette=catalog.characters.find(row=>row.name==='Mouchette');
  const owned=searchWheelCatalog(query({characterId:mouchette.id,ownerMatchOnly:true}),catalog);
  assert.equal(owned.analysisTrack,'theorycrafting');assert.ok(owned.results.some(row=>row.name==='Doomsday Rampage'));assert.ok(owned.results.every(row=>row.ownerMatchesSelectedCharacter));
  const arachne=catalog.characters.find(row=>row.name==='Arachne');
  const pursuit=searchWheelCatalog(query({query:'eternal weave',characterId:arachne.id,ownerMatchOnly:true,tags:['Pursuit'],mainstatKeys:['REALM_MASTERY']}),catalog);
  assert.deepEqual(pursuit.results.map(row=>row.name),['Eternal Weave']);assert.equal(pursuit.finalDamage,null);
  assert.ok(pursuit.limitations.some(row=>row.includes('not a ranking')));
});

test('Wheel catalog search rejects cross-track and invented filters by exact schema',()=>{
  assert.throws(()=>searchWheelCatalog({...query({}),analysisTrack:'cheese-analysis'},catalog));
  assert.throws(()=>searchWheelCatalog(query({characterId:null,ownerMatchOnly:true}),catalog));
  assert.throws(()=>searchWheelCatalog(query({tags:['Pursuit','Pursuit']}),catalog));
  assert.throws(()=>searchWheelCatalog(query({limit:0}),catalog));
});
