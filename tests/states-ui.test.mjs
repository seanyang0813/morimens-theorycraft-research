import test from 'node:test';
import assert from 'node:assert/strict';
import {startStates} from '../website/dist/states.mjs';
import {runStateSequenceExperiment} from '../engine/state-sequence-experiment.mjs';
import {syntheticStateSequenceExample} from '../engine/state-sequence-example.mjs';
test('buff UI carries input/fingerprint, shows mutations and changes results with order',()=>{
  class Element{constructor(){this.children=[];this.textContent='';this.value='';this.hidden=false;}append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}}
  const nodes=new Map(),doc={getElementById(id){if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);},createElement(){return new Element();}};
  startStates({runStateSequenceExperiment,syntheticStateSequenceExample,runtimeFingerprint:'c'.repeat(64)},doc);
  nodes.get('example').onclick();let output=JSON.parse(nodes.get('result-json').textContent);
  assert.equal(output.result.modeledHpLost,520);assert.equal(output.input.kind,'morimens-state-sequence');assert.equal(output.runtimeFingerprint,'c'.repeat(64));
  assert.equal(nodes.get('rows').children.length,7);assert.match(nodes.get('rows').children[1].children[3].textContent,/be_damage_per2: 0 → 30/);
  nodes.get('swap').onclick();output=JSON.parse(nodes.get('result-json').textContent);assert.equal(output.result.modeledHpLost,550);
  const removal=JSON.parse(nodes.get('state-input').value);removal.steps.push({type:'removeState',definitionId:80331});
  nodes.get('state-input').value=JSON.stringify(removal);nodes.get('run').onclick();
  assert.equal(nodes.get('rows').children[7].children[1].textContent,'Remove state 80331');assert.equal(nodes.get('rows').children[7].children[2].textContent,'Removed');
  nodes.get('state-input').value='invalid';nodes.get('run').onclick();assert.equal(nodes.get('results').hidden,true);assert.equal(nodes.get('result-json').textContent,'');assert.equal(nodes.get('rows').children.length,0);
  nodes.get('example').onclick();assert.equal(nodes.get('error').textContent,'');assert.equal(nodes.get('results').hidden,false);
  const controls=index=>nodes.get('step-list').children[index].children[1].children;
  assert.equal(controls(0)[0].disabled,true);assert.equal(controls(6)[1].disabled,true);
  controls(1)[0].onclick();assert.equal(JSON.parse(nodes.get('result-json').textContent).result.modeledHpLost,550);
  nodes.get('undo').onclick();assert.equal(JSON.parse(nodes.get('result-json').textContent).result.modeledHpLost,520);assert.equal(nodes.get('undo').disabled,true);
  controls(0)[2].onclick();assert.equal(JSON.parse(nodes.get('state-input').value).steps.length,8);assert.equal(JSON.parse(nodes.get('result-json').textContent).result.modeledHpLost,620);
  controls(0)[3].onclick();assert.equal(JSON.parse(nodes.get('state-input').value).steps.length,7);assert.equal(JSON.parse(nodes.get('result-json').textContent).result.modeledHpLost,520);
  const stale=controls(0)[1];const edited=JSON.parse(nodes.get('state-input').value);edited.steps.reverse();edited.steps[0].rows[0].Para='200';nodes.get('state-input').value=JSON.stringify(edited);
  stale.onclick();assert.match(nodes.get('error').textContent,/Run your edited JSON/);assert.equal(nodes.get('results').hidden,true);assert.equal(JSON.parse(nodes.get('state-input').value).steps[0].rows[0].Para,'200');
  const lethal=syntheticStateSequenceExample();lethal.attackBase.targetState.hp=50;nodes.get('state-input').value=JSON.stringify(lethal);nodes.get('run').onclick();
  assert.equal(nodes.get('rows').children.length,1);assert.equal(nodes.get('step-list').children.length,7);
});
