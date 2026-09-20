import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {changeMasteryProperty} from '../engine/mastery-property.mjs';
import {resolveFinalRealmMastery} from '../engine/singularity-realm.mjs';
const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-mastery-property.json',import.meta.url)));
test('mastery mutations preserve original derived-property values and nested callback order',()=>{
  for(const {input:i,expected} of evidence.fixtures){
    const properties={occupation_master:i.mastery,occupation_master_final_per:i.percent,occupation_master_final:Math.ceil(i.mastery*(100+i.percent)/100)};
    const r=changeMasteryProperty({build:evidence.build,properties,property:i.property,delta:i.delta});
    assert.deepEqual(r.properties,expected.properties);assert.deepEqual(r.callbacks,expected.callbacks);
    assert.equal(resolveFinalRealmMastery({occupationMaster:r.properties.occupation_master,finalMasteryPercent:r.properties.occupation_master_final_per}).finalRealmMastery,expected.properties.occupation_master_final);
    assert.equal(properties.occupation_master,i.mastery);
  }
});
test('unsupported mutations reject rather than invent clamp behavior',()=>{
  const input={build:evidence.build,properties:{occupation_master:0,occupation_master_final_per:0,occupation_master_final:0},property:'occupation_master',delta:0};
  assert.throws(()=>changeMasteryProperty({...input,delta:-1}));
  assert.throws(()=>changeMasteryProperty({...input,property:'crit'}));
});
