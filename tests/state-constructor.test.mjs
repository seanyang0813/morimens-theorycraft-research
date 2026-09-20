import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {constructNumericState} from '../engine/state-constructor.mjs';
import {createManagedState} from '../engine/state-manager-creation.mjs';
const hooks={initializeParser:()=>{},initializeTriggers:()=>{},logLayers:()=>{}};
test('constructor numeric state matches 96 original constructor chains',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-state-constructor.json',import.meta.url),'utf8'));
  assert.equal(evidence.fixtures.length,96);
  for(const {input:v,expected} of evidence.fixtures){
    const result=constructNumericState({uid:88,stateId:2669,caster:7,layer:v.layer,maximum:v.maximum,recover:v.recover,restoredData:v.restoredData?{layer:3,changedLayer:9,casterLayers:{7:3}}:null,skillLevel:v.skillLevel,parameter:v.parameter,hooks});
    const s=result.state;
    assert.deepEqual({uid:s.uid,layer:s.layer,changedLayer:s.changedLayer,casterLayers7:s.casterLayers[7],skillLevel:s.skillLevel,parameters:s.parameters,trace:[...result.trace,'properties']},expected,JSON.stringify(v));
  }
});
test('authored manager construction exposes requested ChangedLayer at property initialization after cap',()=>{
  const registry=new Map(),order=[];
  const result=createManagedState({target:{uid:7,role:'Monster',dead:false},createArgs:{stateId:2669,layer:8,skipOnAdd:false},registry,deathHandling:'Wipe',teamUnique:false,
    hooks:{construct:(target,args)=>constructNumericState({uid:88,stateId:args.stateId,caster:7,layer:args.layer,maximum:4.2,recover:false,restoredData:null,skillLevel:6,parameter:null,
      hooks:{initializeParser:()=>order.push('parser'),initializeTriggers:()=>order.push('triggers'),logLayers:()=>order.push('log')}}).state,
    merge:()=>{throw Error('unexpected merge');},afterInit:state=>{assert.equal(state.layer,5);assert.equal(state.changedLayer,8);assert.equal(state.casterLayers[7],8);assert.ok(registry.get(7).includes(state));order.push('properties');},
    serialize:()=>({}),record:()=>order.push('record'),changeUniqueRole:()=>{},queueOnAdd:()=>order.push('event'),recordStats:()=>{}}});
  assert.equal(result.state.layer,5);assert.deepEqual(order,['parser','triggers','log','properties','record','event']);
});
test('unsupported string parameters cannot silently skip expression evaluation',()=>{
  assert.throws(()=>constructNumericState({uid:1,stateId:2,caster:3,layer:1,maximum:null,recover:false,restoredData:null,skillLevel:1,parameter:'Arg1',hooks}));
});
