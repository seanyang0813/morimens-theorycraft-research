import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateBuildPlan} from '../engine/build-plan.mjs';
const catalog=JSON.parse(readFileSync(new URL('../website/dist/build-catalog.json',import.meta.url)));
const plan=()=>({schemaVersion:1,kind:'morimens-build-plan',catalogRevision:catalog.source.revision,team:[{slotId:'one',characterId:catalog.characters[0].id,level:null,wheelId:null}]});
test('catalog-backed plan preserves unknowns and remains separate from combat results',()=>{
  const input=plan(),result=validateBuildPlan(input,catalog);
  assert.equal(result.status,'PLAN_ONLY');assert.equal(result.finalDamage,null);assert.deepEqual(result.plan,input);
  input.team[0].level=90;assert.equal(result.plan.team[0].level,null);
  const loaded=validateBuildPlan(JSON.parse(JSON.stringify(result.plan)),catalog);assert.deepEqual(loaded,result);
});
test('all catalog identities can be planned without implying implemented mechanics',()=>{
  for(const c of catalog.characters){const p=plan();p.team[0].characterId=c.id;assert.equal(validateBuildPlan(p,catalog).status,'PLAN_ONLY');}
  for(const w of catalog.wheels){const p=plan();p.team[0].wheelId=w.id;assert.equal(validateBuildPlan(p,catalog).status,'PLAN_ONLY');}
});
test('invalid identities, revisions, unknown fields and duplicate slots reject import',()=>{
  for(const mutate of [p=>p.catalogRevision='unknown',p=>p.team[0].characterId='missing',p=>p.team[0].wheelId='missing',p=>p.team[0].level=0,p=>p.team[0].level=NaN,p=>p.team.push({...p.team[0]}),p=>p.team[0].damage=100,p=>p.team=[]]){const p=plan();mutate(p);assert.throws(()=>validateBuildPlan(p,catalog));}
});
test('client build and Gnostic rank survive round trip without filling legacy unknowns',()=>{
  const legacy=plan();assert.equal(Object.hasOwn(validateBuildPlan(legacy,catalog).plan,'clientBuild'),false);
  for(const build of ['pc-res144-build51','pc-res150-build51'])for(const rank of [null,0,5]){const p=plan();p.clientBuild=build;p.team[0].gnosticRank=rank;assert.deepEqual(validateBuildPlan(JSON.parse(JSON.stringify(p)),catalog).plan,p);}
  for(const rank of [-1,6,'5',undefined,NaN]){const p=plan();p.team[0].gnosticRank=rank;assert.throws(()=>validateBuildPlan(p,catalog));}
  const p=plan();p.clientBuild='android';assert.throws(()=>validateBuildPlan(p,catalog));
});
test('advancement talent selection is explicit and round trips without inference',()=>{
  const p=plan();p.clientBuild='pc-res144-build51';p.team[0].advancementTalentId=122481;p.team[0].advancementLevel=10;
  assert.deepEqual(validateBuildPlan(JSON.parse(JSON.stringify(p)),catalog).plan,p);
  for(const patch of [{advancementTalentId:0},{advancementTalentId:'122481'},{advancementLevel:-1},{advancementLevel:11},{advancementLevel:'10'}]){const q=plan();Object.assign(q.team[0],patch);assert.throws(()=>validateBuildPlan(q,catalog));}
  const orphan=plan();orphan.team[0].advancementLevel=0;assert.throws(()=>validateBuildPlan(orphan,catalog));
});
