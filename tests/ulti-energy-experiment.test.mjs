import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {runUltiEnergyExperiment} from '../engine/ulti-energy-experiment.mjs';
function input(){
 const calculation={dimension:0,properties:{ulti_energy_per:0,i_ulti_energy_per:0,ulti_energy_efficiency:0,ulti_energy_plus:0,gain_ulti_energy_per:0,gain_ulti_energy_plus:0},card:null,casterEligible:true,skillTags:[]};
 const maximumProperties={ulti_energy_max:100,ulti_energy_cost_per:0,ulti_energy_cost_flat:0,ulti_energy_max_per:0};
 return {schemaVersion:1,kind:'morimens-ulti-energy-experiment',build:'pc-res144-build51',otherEvents:'assumed-absent',parameters:[10.1,1.1,1],source:{castRoleUid:1,cmdServerUid:2,skillConfigId:3},targetOrder:[7,8],targets:[{uid:7,role:'Awaker',energy:95,maximumProperties,calculation},{uid:8,role:'Awaker',energy:0,maximumProperties,calculation}]};
}
test('effect calculation and capped storage carry energy through target-major repetitions',()=>{
 const v=input(),before=JSON.stringify(v),r=runUltiEnergyExperiment(v);
 assert.deepEqual(r.targetsAfter,[{uid:7,energy:100},{uid:8,energy:22}]);
 assert.deepEqual(r.effect.applications.map(a=>a.target),[7,7,8,8]);
 assert.deepEqual(r.effect.applications.map(a=>a.result.storage.energyGained),[5,0,11,11]);
 assert.ok(r.effect.applications.every(a=>a.source.castValue===11&&a.result.storage.castValue===11));
 assert.equal(r.effect.applications[1].result.storage.events.length,0);
 assert.equal(JSON.stringify(v),before);assert.equal(r.finalDamage,null);
});
test('repeated target identity carries the same state; missing or unsupported targets fail',()=>{
 const v=input();v.targetOrder=[8,8];assert.equal(runUltiEnergyExperiment(v).targetsAfter[1].energy,44);
 v.targetOrder=[99];assert.throws(()=>runUltiEnergyExperiment(v),/identity/);
 v.targetOrder=[7];v.targets[0].role='Player';assert.throws(()=>runUltiEnergyExperiment(v),/Awaker/);
});

test('combined energy experiment matches 324 connected original effect-to-storage cases',()=>{
 const fixtures=JSON.parse(readFileSync(new URL('./synthetic/original-connected-ulti-energy.json',import.meta.url))).fixtures;
 assert.equal(fixtures.length,324);
 for(const {input,expected} of fixtures){
  const r=runUltiEnergyExperiment(input);
  assert.deepEqual({returned:r.effect.returned,energyAfter:r.targetsAfter[0].energy,events:r.effect.applications.flatMap(a=>a.result.storage.events)},expected);
 }
});
