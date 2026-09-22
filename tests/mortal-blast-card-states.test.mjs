import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const fixture=JSON.parse(readFileSync(new URL('./synthetic/original-mortal-blast-card-states.json',import.meta.url)));
const current=JSON.parse(readFileSync(new URL('../research/evidence/pc-res150-mortal-blast-card-states.json',import.meta.url)));

test('Mortal Blast states register on Cards and store their exact properties',()=>{
  assert.equal(fixture.fixtures.length,3);
  const expected=new Map([[2948,['card_cost',-1]],[2454,['consume',1]],[2983,['nothingness',1]]]);
  for(const row of fixture.fixtures){
    const [property,value]=expected.get(row.input.stateId);
    assert.equal(row.input.targetKind,'Card');
    assert.deepEqual(row.expected.storedProperty,{name:property,value});
    assert.equal(row.expected.registryCount,1);
    assert.equal(row.expected.stateId,row.input.stateId);
    assert.equal(row.expected.layer,1);
    const propertyTrace=['construct','uid','parser','InitTrigger','LogBattleLayer',{event:'ownerProperty',property,old:0,new:value},{event:'sendProperty',property,delta:value,new:value}];
    if(property==='card_cost')propertyTrace.push({event:'modifyCardCost'});
    assert.deepEqual(row.expected.trace,[...propertyTrace,'Serialize','recordCard','onAdd','stats']);
  }
});

test('resource 150 reproduces the three connected Card-state fixtures',()=>{
  assert.equal(current.status,'EXACT_MATCH_IN_FIXTURE_DOMAIN');
  assert.equal(current.fixtures,3);assert.equal(current.matched,3);assert.equal(current.mismatches,0);
  assert.deepEqual(Object.keys(current.mechanicsFields).sort(),['2454','2948','2983']);
});
