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
 const terminalRow={id:'3',evaluation:{values:[2669,10]}};
 const runTerminalStateCommand=()=>({status:'EXPERIMENTAL',completed:true,modeledHpLost:20,casterEnergyAfter:9,targetAfter:{hp:80,block:0},stop:null,prefix:{actions:[damage,energy]},terminalRow,terminalRows:[terminalRow],stateApplication:{states:[{stateId:2669,layer:10}]},unresolvedDependencies:[]});
 startActions({runCardActionTimeline,syntheticCardActionExample,runDamageEnergyCommand,runTerminalStateCommand,syntheticDamageEnergyExample,runtimeFingerprint:'d'.repeat(64)},doc);
 doc.getElementById('action-input').value=JSON.stringify(input);nodes.get('run').onclick();
 assert.match(nodes.get('summary').textContent,/States 2669 \+10/);assert.equal(nodes.get('rows').children.length,3);
 assert.match(nodes.get('rows').children[2].children[4].textContent,/requested at layer 10/);
});

test('ordered-state command UI shows state and damage rows in command order',()=>{
 class Element{constructor(){this.children=[];this.textContent='';this.value='';this.hidden=false;}append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}}
 const nodes=new Map(),doc={getElementById(id){if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);},createElement(){return new Element();}};
 const input={kind:'morimens-ordered-state-command',attackBase:{targetState:{hp:100,block:0}},command:{data_list:{1:{},2:{}}}};
 const rowPlan=[{rowId:'1',type:'applyState',evaluation:{values:[19534]}},{rowId:'2',type:'attack'}];
 const runOrderedStateCommand=()=>({completed:true,modeledHpLost:25,casterEnergyAfter:null,targetAfter:{hp:75,block:0},stop:null,rowPlan,calculation:{trace:[{type:'applyState'},{type:'attack',result:{completed:true,targetAfter:{hp:75,block:0}}}]},unresolvedDependencies:[]});
 startActions({runCardActionTimeline,syntheticCardActionExample,runDamageEnergyCommand,runTerminalStateCommand:()=>{},runOrderedStateCommand,syntheticDamageEnergyExample,runtimeFingerprint:'e'.repeat(64)},doc);
 doc.getElementById('action-input').value=JSON.stringify(input);nodes.get('run').onclick();
 assert.match(nodes.get('summary').textContent,/States 19534 \+1/);assert.equal(nodes.get('rows').children.length,2);
 assert.match(nodes.get('rows').children[0].children[4].textContent,/State 19534/);assert.equal(nodes.get('rows').children[1].children[2].textContent,'100 → 75');
});

test('ordered command UI shows target Block gain before later damage',()=>{
 class Element{constructor(){this.children=[];this.textContent='';this.value='';this.hidden=false;}append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}}
 const nodes=new Map(),doc={getElementById(id){if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);},createElement(){return new Element();}};
 const input={kind:'morimens-ordered-state-command',attackBase:{targetState:{hp:100,block:0}},command:{data_list:{1:{},2:{}}}};
 const rowPlan=[{rowId:'1',type:'gainBlock',evaluation:{values:[50]}},{rowId:'2',type:'attack'}];
 const runOrderedStateCommand=()=>({completed:true,modeledHpLost:0,casterEnergyAfter:null,actorBlockAfter:10,targetAfter:{hp:100,block:25},stop:null,rowPlan,calculation:{trace:[{type:'gainBlock',owner:'target',result:{blockAfter:50,actualBlockGained:50}},{type:'attack',result:{completed:true,targetAfter:{hp:100,block:25}}}]},unresolvedDependencies:[]});
 startActions({runCardActionTimeline,syntheticCardActionExample,runDamageEnergyCommand,runTerminalStateCommand:()=>{},runOrderedStateCommand,syntheticDamageEnergyExample,runtimeFingerprint:'f'.repeat(64)},doc);
 doc.getElementById('action-input').value=JSON.stringify(input);nodes.get('run').onclick();
 assert.match(nodes.get('summary').textContent,/Caster Block: 10/);assert.equal(nodes.get('rows').children[0].children[3].textContent,'0 → 50');assert.match(nodes.get('rows').children[0].children[4].textContent,/Target Block \+50/);
 assert.equal(nodes.get('rows').children[1].children[3].textContent,'50 → 25');
});

test('ordered command UI shows target Heal before later damage',()=>{
 class Element{constructor(){this.children=[];this.textContent='';this.value='';this.hidden=false;}append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}}
 const nodes=new Map(),doc={getElementById(id){if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);},createElement(){return new Element();}};
 const input={kind:'morimens-ordered-state-command',attackBase:{targetState:{hp:500,block:0}},command:{data_list:{1:{},2:{}}}};
 const rowPlan=[{rowId:'1',type:'heal',evaluation:{values:[100]}},{rowId:'2',type:'attack'}];
 const runOrderedStateCommand=()=>({completed:true,modeledHpLost:0,casterEnergyAfter:null,actorBlockAfter:null,actorHpAfter:700,targetAfter:{hp:500,block:0},stop:null,rowPlan,calculation:{trace:[{type:'heal',owner:'target',result:{hpAfter:600,realHeal:100,overFlowHeal:0}},{type:'attack',result:{completed:true,targetAfter:{hp:500,block:0}}}]},unresolvedDependencies:[]});
 startActions({runCardActionTimeline,syntheticCardActionExample,runDamageEnergyCommand,runTerminalStateCommand:()=>{},runOrderedStateCommand,syntheticDamageEnergyExample,runtimeFingerprint:'0'.repeat(64)},doc);
 doc.getElementById('action-input').value=JSON.stringify(input);nodes.get('run').onclick();
 assert.match(nodes.get('summary').textContent,/Caster HP: 700/);assert.equal(nodes.get('rows').children[0].children[2].textContent,'500 → 600');assert.match(nodes.get('rows').children[0].children[4].textContent,/Target Heal \+100/);assert.equal(nodes.get('rows').children[1].children[2].textContent,'600 → 500');
});

test('ordered command UI advances target state for Passive damage rows',()=>{
 class Element{constructor(){this.children=[];this.textContent='';this.value='';this.hidden=false;}append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}}
 const nodes=new Map(),doc={getElementById(id){if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);},createElement(){return new Element();}};
 const input={kind:'morimens-ordered-state-command',attackBase:{targetState:{hp:500,block:50}},command:{data_list:{1:{}}}};
 const rowPlan=[{rowId:'1',type:'passiveAttack'}];
 const runOrderedStateCommand=()=>({completed:true,modeledHpLost:75,casterEnergyAfter:null,actorBlockAfter:null,actorHpAfter:null,targetAfter:{hp:425,block:0},stop:null,rowPlan,calculation:{trace:[{type:'passiveAttack',result:{completed:true,targetAfter:{hp:425,block:0}}}]},unresolvedDependencies:[]});
 startActions({runCardActionTimeline,syntheticCardActionExample,runDamageEnergyCommand,runTerminalStateCommand:()=>{},runOrderedStateCommand,syntheticDamageEnergyExample,runtimeFingerprint:'1'.repeat(64)},doc);
 doc.getElementById('action-input').value=JSON.stringify(input);nodes.get('run').onclick();
 assert.equal(nodes.get('rows').children[0].children[2].textContent,'500 → 425');assert.equal(nodes.get('rows').children[0].children[3].textContent,'50 → 0');assert.equal(nodes.get('rows').children[0].children[4].textContent,'Passive damage');
});

test('ordered command UI labels Fixed and Pure damage categories',()=>{
 class Element{constructor(){this.children=[];this.textContent='';this.value='';this.hidden=false;}append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}}
 const nodes=new Map(),doc={getElementById(id){if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);},createElement(){return new Element();}};
 const input={kind:'morimens-ordered-state-command',attackBase:{targetState:{hp:500,block:20}},command:{data_list:{1:{},2:{}}}};
 const rowPlan=[{rowId:'1',type:'effectAttack',category:'FIXED'},{rowId:'2',type:'effectAttack',category:'PURE'}];
 const runOrderedStateCommand=()=>({completed:true,modeledHpLost:180,casterEnergyAfter:null,actorBlockAfter:null,actorHpAfter:null,targetAfter:{hp:320,block:0},stop:null,rowPlan,calculation:{trace:[{type:'effectAttack',category:'FIXED',result:{completed:true,targetAfter:{hp:420,block:0}}},{type:'effectAttack',category:'PURE',result:{completed:true,targetAfter:{hp:320,block:0}}}]},unresolvedDependencies:[]});
 startActions({runCardActionTimeline,syntheticCardActionExample,runDamageEnergyCommand,runTerminalStateCommand:()=>{},runOrderedStateCommand,syntheticDamageEnergyExample,runtimeFingerprint:'2'.repeat(64)},doc);
 doc.getElementById('action-input').value=JSON.stringify(input);nodes.get('run').onclick();
 assert.equal(nodes.get('rows').children[0].children[4].textContent,'FIXED damage');assert.equal(nodes.get('rows').children[1].children[4].textContent,'PURE damage');assert.equal(nodes.get('rows').children[1].children[2].textContent,'420 → 320');
});
