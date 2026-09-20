import {runDamageEnergyCommand} from '../engine/damage-energy-command.mjs';
import {syntheticDamageEnergyExample} from '../engine/damage-energy-example.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {startActions} from '../website/dist/actions.mjs';
import {runCardActionTimeline} from '../engine/card-action-timeline.mjs';
import {syntheticCardActionExample} from '../engine/card-action-example.mjs';
test('action UI runs, reverses payment order and clears invalid output without browser control',()=>{
  class Element{constructor(){this.children=[];this.textContent='';this.value='';this.hidden=false;}append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}}
  const nodes=new Map(),doc={getElementById(id){if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);},createElement(){return new Element();}};
  startActions({runCardActionTimeline,syntheticCardActionExample,runtimeFingerprint:'b'.repeat(64)},doc);
  nodes.get('example').onclick();let output=JSON.parse(nodes.get('result-json').textContent);
  assert.equal(output.result.modeledHpLost,500);assert.equal(output.result.completed,true);assert.equal(output.runtimeFingerprint,'b'.repeat(64));
  nodes.get('reverse').onclick();output=JSON.parse(nodes.get('result-json').textContent);
  assert.equal(output.result.modeledHpLost,300);assert.equal(output.result.completed,false);assert.match(nodes.get('rows').children[1].children[4].textContent,/Rejected/);
  nodes.get('action-input').value='invalid';nodes.get('run').onclick();assert.equal(nodes.get('results').hidden,true);assert.equal(nodes.get('result-json').textContent,'');assert.ok(nodes.get('error').textContent);
  nodes.get('example').onclick();assert.equal(nodes.get('results').hidden,false);assert.equal(nodes.get('error').textContent,'');
});

test('mixed command UI shows ultimate energy, preserves input and blocks unsupported rows',()=>{
 class Element{constructor(){this.children=[];this.textContent='';this.value='';this.hidden=false;}append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}}
 const nodes=new Map(),doc={getElementById(id){if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);},createElement(){return new Element();}};
 startActions({runCardActionTimeline,syntheticCardActionExample,runDamageEnergyCommand,syntheticDamageEnergyExample,runtimeFingerprint:'c'.repeat(64)},doc);
 nodes.get('mixed-example').onclick();let output=JSON.parse(nodes.get('result-json').textContent);
 assert.equal(output.result.modeledHpLost,120);assert.equal(output.result.casterEnergyAfter,100);assert.equal(output.input.command.ID,2112);
 assert.equal(nodes.get('energy-heading').textContent,'Ultimate energy');assert.equal(nodes.get('rows').children.length,2);
 const input=output.input;input.variables.Arg1=2000;nodes.get('action-input').value=JSON.stringify(input);nodes.get('run').onclick();
 assert.equal(JSON.parse(nodes.get('result-json').textContent).result.casterEnergyAfter,95);
 nodes.get('reverse').onclick();output=JSON.parse(nodes.get('result-json').textContent);assert.equal(output.result.casterEnergyAfter,100);assert.equal(output.result.actions[0].type,'energy');
 input.command.data_list['3']={Type:'BEAddState',Target:'CmdCaster',Para:'1,1'};nodes.get('action-input').value=JSON.stringify(input);nodes.get('run').onclick();
 assert.match(nodes.get('summary').textContent,/no calculation/);assert.equal(JSON.parse(nodes.get('result-json').textContent).result.calculation,null);
 assert.match(nodes.get('rows').children[2].children[4].textContent,/EFFECT_HANDLER/);
 nodes.get('action-input').value='bad';nodes.get('run').onclick();assert.equal(nodes.get('result-json').textContent,'');assert.equal(nodes.get('results').hidden,true);
});

test('terminal-state command UI shows the damage/energy prefix and applied state',()=>{
 class Element{constructor(){this.children=[];this.textContent='';this.value='';this.hidden=false;}append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}}
 const nodes=new Map(),doc={getElementById(id){if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);},createElement(){return new Element();}};
 const input={kind:'morimens-terminal-state-command',energy:{target:{energy:5}},attackBase:{targetState:{hp:100,block:4}},command:{data_list:{}}};
 const damage={rowId:'1',type:'damage',result:{targetAfter:{hp:80,block:0},completed:true}},energy={rowId:'2',type:'energy',result:{targetsAfter:[{energy:9}]}};
 const runTerminalStateCommand=()=>({status:'EXPERIMENTAL',completed:true,modeledHpLost:20,casterEnergyAfter:9,targetAfter:{hp:80,block:0},stop:null,prefix:{actions:[damage,energy]},terminalRow:{id:'3',evaluation:{values:[2669,10]}},stateApplication:{states:[{stateId:2669,layer:10}]},unresolvedDependencies:[]});
 startActions({runCardActionTimeline,syntheticCardActionExample,runDamageEnergyCommand,runTerminalStateCommand,syntheticDamageEnergyExample,runtimeFingerprint:'d'.repeat(64)},doc);
 doc.getElementById('action-input').value=JSON.stringify(input);nodes.get('run').onclick();
 assert.match(nodes.get('summary').textContent,/State 2669 layer 10/);assert.equal(nodes.get('rows').children.length,3);
 assert.match(nodes.get('rows').children[2].children[4].textContent,/applied at layer 10/);
});
