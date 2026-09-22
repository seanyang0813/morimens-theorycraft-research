import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveWheelInitialProperties} from '../engine/wheel-initial-properties.mjs';

const base={schemaVersion:1,kind:'morimens-wheel-initial-properties',build:'pc-res144-build51',wheelId:'wheel-0128',stateArgs:{StateArg1:25,StateArg2:40,StateArg3:10},ownerProperties:null};

test('Eternal Weave initial block contribution uses its resolved max-refinement StateArg',()=>{
  const result=resolveWheelInitialProperties({...base,properties:[{property:'o_block_per',expression:'StateArg1'}]});
  assert.equal(result.analysisTrack,'mechanics');
  assert.deepEqual(result.propertyDeltas,{o_block_per:25});
  assert.equal(result.finalDamage,null);
});

test('Doomsday Rampage applies the same source-bound argument to both direct properties',()=>{
  const result=resolveWheelInitialProperties({...base,wheelId:'wheel-0029',stateArgs:{StateArg1:60,StateArg2:25},properties:[{property:'o_damage_per_attachpost',expression:'StateArg1'},{property:'o_damage_per_ulti',expression:'StateArg1'}]});
  assert.deepEqual(result.propertyDeltas,{o_damage_per_attachpost:60,o_damage_per_ulti:60});
});

test('observed owner-stat forms resolve explicitly and preserve client ceiling boundaries',()=>{
  const result=resolveWheelInitialProperties({...base,ownerProperties:{atk:123.4,physique:20,physique_per:15},properties:[{property:'scaled_physique',expression:'StateArg1*StateOwner.physique*0.01*(1+StateOwner.physique_per/100)'},{property:'scaled_atk',expression:'math.ceil(StateOwner.atk*StateArg3*0.01)'}]});
  assert.deepEqual(result.propertyDeltas,{scaled_physique:6,scaled_atk:13});
  assert.deepEqual(result.contributions[1].calls,[{name:'math.ceil',args:[12.34],value:13}]);
});

test('initial-property resolver rejects missing stats, unknown grammar and loose schemas',()=>{
  assert.throws(()=>resolveWheelInitialProperties({...base,properties:[{property:'x',expression:'math.ceil(StateOwner.atk*StateArg3*0.01)'}]}),/Missing/);
  assert.throws(()=>resolveWheelInitialProperties({...base,properties:[{property:'x',expression:'os.execute(1)'}]}),/Unsupported/);
  assert.throws(()=>resolveWheelInitialProperties({...base,properties:[{property:'x',expression:'StateArg1+1'}]}),/Unsupported/);
  assert.throws(()=>resolveWheelInitialProperties({...base,properties:[{property:'x',expression:'StateArg1'}],analysisTrack:'theorycrafting'}));
});
