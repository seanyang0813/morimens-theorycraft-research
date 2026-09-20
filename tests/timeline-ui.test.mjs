import test from 'node:test';
import assert from 'node:assert/strict';
import {runResearchTimeline} from '../engine/research-timeline.mjs';
import {compareTimelines} from '../engine/timeline-experiments.mjs';
// Event-level check without opening the user's browser; layout is not covered.
test('timeline UI reorders hits, compares pinned order and clears invalid results',async()=>{
  class Element{
    constructor(){this.children=[];this.textContent='';this.value='';this.hidden=false;}
    append(...items){this.children.push(...items);}
    replaceChildren(...items){this.children=[...items];}
    setAttribute(){}
  }
  const nodes=new Map();
  globalThis.document={getElementById(id){if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);},createElement(){return new Element();}};
  try{
    const {startTimeline}=await import('../website/dist/timeline.mjs');startTimeline({runResearchTimeline,compareTimelines,runtimeFingerprint:'a'.repeat(64)});
    nodes.get('example').onclick();
    assert.equal(JSON.parse(nodes.get('result-json').textContent).modeledHpLost,150);
    nodes.get('pin').onclick();
    nodes.get('rows').children[0].children[4].children[1].onclick();
    assert.equal(JSON.parse(nodes.get('result-json').textContent).modeledHpLost,100);
    assert.match(nodes.get('comparison').textContent,/HP loss change -50/);
    const saved=nodes.get('comparison-input').value;
    assert.equal(JSON.parse(saved).runtimeFingerprint,'a'.repeat(64));
    nodes.get('example').onclick();nodes.get('comparison-input').value=saved;nodes.get('load-comparison').onclick();
    assert.match(nodes.get('comparison').textContent,/HP loss change -50/);
    assert.equal(JSON.parse(nodes.get('timeline-input').value).steps[0].id,'synthetic-ordinary');
    const edited=JSON.parse(nodes.get('timeline-input').value);edited.target.hp=2000;
    nodes.get('timeline-input').value=JSON.stringify(edited);nodes.get('run').onclick();
    assert.match(nodes.get('comparison').textContent,/different hit inputs or target assumptions/);
    nodes.get('timeline-input').value='invalid';nodes.get('run').onclick();
    assert.equal(nodes.get('results').hidden,true);assert.ok(nodes.get('error').textContent);
    nodes.get('example').onclick();assert.equal(nodes.get('results').hidden,false);assert.equal(nodes.get('error').textContent,'');
    nodes.get('embers-example').onclick();
    const embers=JSON.parse(nodes.get('result-json').textContent);
    assert.equal(embers.modeledHpLost,30);assert.equal(embers.executedSteps,2);
    assert.equal(embers.trace[0].hit.modeledHpLost,0);
    assert.equal(nodes.get('rows').children[0].children[3].textContent,'15');
    assert.match(nodes.get('traces').children[0].children[1].textContent,/Direct hit HP loss: 0. Generated HP loss: 15/);
    assert.match(nodes.get('traces').children[0].children[3].children[0].textContent,/caused by synthetic-fixed-1/);
    nodes.get('pin').onclick();
    assert.match(nodes.get('comparison').textContent,/old-embers-only-assumed/);
    assert.doesNotMatch(nodes.get('comparison').textContent,/assume no intervening/);
  }finally{delete globalThis.document;}
});
