import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveWheelMainstat} from '../engine/wheel-stats.mjs';
import {validateBuildPlan} from '../engine/build-plan.mjs';
const catalog=JSON.parse(readFileSync(new URL('../website/dist/build-catalog.json',import.meta.url)));
const input=(wheelId,enhanceLevel)=>({catalogRevision:catalog.source.revision,wheelId,enhanceLevel});
test('all saved Wheels resolve each supported enhancement without applying passive effects',()=>{
  for(const w of catalog.wheels)for(let level=0;level<=15;level++){
    const result=resolveWheelMainstat(input(w.id,level),catalog);
    assert.equal(result.status,'CATALOG_DERIVED');assert.equal(result.finalDamage,null);
    assert.equal(result.trace.growthSteps,Math.max(0,level-3));assert.ok(Number.isFinite(result.value));
    assert.equal(result.descriptionRank,Math.min(level,3)+1);
  }
});
test('SSR Realm Mastery stays 36 through E3, grows at E3 + 1, reaches 72 at E3 + 12',()=>{
  const w=catalog.wheels.find(w=>w.rarity==='SSR'&&w.mainstatKey==='REALM_MASTERY');
  for(const level of [0,1,2,3])assert.equal(resolveWheelMainstat(input(w.id,level),catalog).value,36);
  assert.equal(resolveWheelMainstat(input(w.id,4),catalog).value,39);
  const max=resolveWheelMainstat(input(w.id,15),catalog);assert.equal(max.value,72);assert.equal(max.unit,'flat');
  const crit=catalog.wheels.find(w=>w.rarity==='SSR'&&w.mainstatKey==='CRIT_DMG');
  const r=resolveWheelMainstat(input(crit.id,15),catalog);assert.equal(r.value,43.2);assert.equal(r.unit,'percent');
});
test('Wheel selection metadata exposes signatures and discovery tags without executing passives',()=>{
  const arachne=catalog.wheels.find(w=>w.name==='Eternal Weave'),mouchette=catalog.wheels.find(w=>w.name==='Doomsday Rampage');
  assert.equal(arachne.ownerAwakenerName,'Arachne');assert.ok(arachne.searchTags.includes('Pursuit'));
  assert.equal(mouchette.ownerAwakenerName,'Mouchette');assert.ok(mouchette.searchTags.includes('Strike'));
  const result=resolveWheelMainstat(input(mouchette.id,15),catalog);
  assert.equal(result.wheel.ownerAwakenerName,'Mouchette');assert.deepEqual(result.wheel.searchTags,mouchette.searchTags);
  assert.ok(result.unresolvedDependencies.some(row=>row.includes('not executable passive effects')));
});
test('unknown and invalid enhancements reject rather than clamp or default',()=>{
  for(const level of [null,undefined,'0',-1,16,2.5,NaN,Infinity])assert.throws(()=>resolveWheelMainstat(input(catalog.wheels[0].id,level),catalog));
  assert.throws(()=>resolveWheelMainstat(input('missing',0),catalog));
  assert.throws(()=>resolveWheelMainstat({...input(catalog.wheels[0].id,0),catalogRevision:'other'},catalog));
});
test('plans preserve enhancement and distinguish absent, unknown and E0',()=>{
  const plan={schemaVersion:1,kind:'morimens-build-plan',catalogRevision:catalog.source.revision,team:[{slotId:'one',characterId:catalog.characters[0].id,level:null,wheelId:catalog.wheels[0].id}]};
  assert.equal(Object.hasOwn(validateBuildPlan(plan,catalog).plan.team[0],'wheelEnhanceLevel'),false);
  for(const value of [null,0,15]){plan.team[0].wheelEnhanceLevel=value;assert.deepEqual(validateBuildPlan(JSON.parse(JSON.stringify(plan)),catalog).plan,plan);}
  plan.team[0].wheelId=null;assert.throws(()=>validateBuildPlan(plan,catalog));
  plan.team[0].wheelEnhanceLevel=null;assert.doesNotThrow(()=>validateBuildPlan(plan,catalog));
});
