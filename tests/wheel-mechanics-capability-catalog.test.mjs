import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const catalog=JSON.parse(readFileSync(new URL('../research/evidence/wheel-mechanics-capability-catalog.json',import.meta.url)));

test('Wheel mechanics capability catalog is static mechanics discovery metadata',()=>{
  assert.equal(catalog.analysisTrack,'mechanics');
  assert.equal(catalog.status,'STATIC_MECHANICS_FINGERPRINTS');
  assert.deepEqual(catalog.summary,{wheelCount:146,uniqueMechanicsFingerprints:141,unresolvedFingerprints:5,mechanicCategoryCount:13});
  assert.equal(catalog.wheels.length,146);
  assert.equal(catalog.wheels.filter(row=>row.crosswalkStatus==='UNIQUE').length,141);
  for(const row of catalog.wheels.filter(row=>row.crosswalkStatus==='UNIQUE')){
    assert.ok(Array.isArray(row.effectTypes));
    assert.ok(Array.isArray(row.mechanicCategories));
    assert.ok(Number.isInteger(row.potentiallyLinkedStates) && row.potentiallyLinkedStates>=1);
    assert.equal('description' in row,false);
    assert.equal('parameters' in row,false);
  }
  assert.ok(catalog.limitations.some(value=>value.includes('no cheese')));
});

test('Mouchette and Arachne associated Wheels expose bounded fingerprints',()=>{
  const byName=Object.fromEntries(catalog.wheels.map(row=>[row.name,row]));
  assert.ok(byName['Doomsday Rampage'].mechanicCategories.includes('state'));
  assert.ok(byName['Eternal Weave'].mechanicCategories.includes('ultimate-energy'));
  assert.ok(byName['Eternal Weave'].mechanicCategories.includes('state'));
  assert.ok(byName['Rota Fortunae'].mechanicCategories.includes('state'));
});
