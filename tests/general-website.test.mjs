import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fieldsFor,calculateGeneral,calculateCriticalBranches,buildGeneralScenario,supportedDamageCategories} from '../website/dist/general-calculator.mjs';
import {compareScenarios} from '../engine/experiments.mjs';
const setup=type=>({damageType:type,values:Object.fromEntries(fieldsFor(type).map(f=>[f.key,f.defaultValue??100])),isCrit:false,hitEnabled:false});
test('general website supports all four recovered formula categories without a character preset',()=>{
  for(const category of ['ACTIVE','PASSIVE','FIXED','PURE']){
    const input=setup(category),result=calculateGeneral(input);
    assert.equal(result.experimentalModels[0].preHitDamage,100);assert.equal(result.finalDamage,null);assert.equal(result.analysisTrack,'theorycrafting');
    input.values[category==='ACTIVE'?'offense.value':'baseDamage']='';assert.throws(()=>calculateGeneral(input));
    for(const missing of [null,true,'   ']){input.values[category==='ACTIVE'?'offense.value':'baseDamage']=missing;assert.throws(()=>calculateGeneral(input));}
  }
});
test('general website carries critical and shield/HP inputs into the engine',()=>{
  const input=setup('ACTIVE');input.isCrit=true;input.values['target.awakerCritDamage']=150;
  Object.assign(input,{hitEnabled:true,hitValues:{hp:1000,block:50,retainHp:0,limit:0,usedLimit:0,deathResist:0},immune:false,puncture:false,preventEligible:false});
  const result=calculateGeneral(input);assert.equal(result.experimentalModels[0].preHitDamage,250);assert.equal(result.experimentalModels[2].modeledHpLost,200);
});
test('unknown critical roll shows both conditional amounts without claiming one outcome',()=>{
  const input=setup('ACTIVE');input.values['target.awakerCritDamage']=150;
  const conditional=calculateCriticalBranches(input);
  assert.equal(conditional.status,'CONDITIONAL_BRANCHES_ONLY');
  assert.equal(conditional.branches.noncritical.preHitDamage,100);
  assert.equal(conditional.branches.critical.preHitDamage,250);
  assert.equal(conditional.branches.critical.result.finalDamage,null);
  assert.throws(()=>calculateCriticalBranches(setup('FIXED')),/only for Active and Tentacle/);
});
test('installed Tentacle page routes resolved inputs into the shared formula and A/B comparison',()=>{
  assert.deepEqual(supportedDamageCategories['pc-res151-build51'],['FIXED','PURE','TENTACLE']);
  const input={...setup('TENTACLE'),clientBuild:'pc-res151-build51',isCrit:true};
  input.values.tentacleDamage=100;input.values.critDamagePer=150;input.values.beTentacleDamagePer=20;
  const result=calculateGeneral(input);
  assert.equal(result.experimentalModels[0].preHitDamage,300);
  assert.equal(result.finalDamage,null);
  const baseline=buildGeneralScenario(input);
  const candidate=buildGeneralScenario({...input,values:{...input.values,beTentacleDamagePer:50}});
  const comparison=compareScenarios({schemaVersion:1,baseline,candidate});
  assert.equal(comparison.metrics.delta.preHitDamage,75);
  assert.throws(()=>calculateGeneral({...input,hitEnabled:true}),/only available/);
  assert.throws(()=>calculateGeneral({...input,clientBuild:'pc-res150-build51'}),/unsupported/);
  assert.throws(()=>compareScenarios({schemaVersion:1,baseline,candidate:buildGeneralScenario(setup('ACTIVE'))}),/same client build/);
});
test('general website resolves local module imports and keeps the scenario separate',()=>{
  const modules=JSON.parse(readFileSync(new URL('../website/engine-modules.json',import.meta.url)));
  for(const name of modules){
    const file=new URL('../website/dist/engine/'+name,import.meta.url),text=readFileSync(file,'utf8');
    for(const match of text.matchAll(/from\s+['"](\.\/[^'"]+)['"]/g))assert.ok(existsSync(new URL(match[1],file)),name+' missing '+match[1]);
  }
  const home=readFileSync(new URL('../website/dist/index.html',import.meta.url),'utf8');
  assert.ok(home.includes('damage-type'));assert.ok(home.includes('client-build'));assert.ok(home.includes('value="TENTACLE"'));assert.ok(home.includes('mouchette.html'));assert.ok(!home.includes('id="mastery"'));
  const preset=readFileSync(new URL('../website/dist/mouchette.html',import.meta.url),'utf8');assert.ok(preset.includes('src="mouchette.mjs"'));
  const builds=readFileSync(new URL('../website/dist/builds.html',import.meta.url),'utf8');
  assert.match(builds,/<select id="client-build"><option value="">Unknown \/ not selected<\/option><option value="pc-res151-build51">PC · res151 build51 \(installed client\)<\/option><option value="pc-res150-build51">PC · res150 build51 \(previous client\)<\/option><option value="pc-res144-build51">PC · res144 build51 \(historical research build\)<\/option><\/select>/);
  assert.ok(builds.includes('id="assemble"'));assert.ok(builds.includes('id="assembly"'));
  const snapshot=readFileSync(new URL('../website/dist/snapshot.html',import.meta.url),'utf8');
  assert.ok(snapshot.includes('snapshot-bootstrap.mjs'));assert.ok(snapshot.includes('id="input"'));assert.ok(snapshot.includes('id="sequence-example"'));assert.ok(snapshot.includes('complete captured maps only'));
});
