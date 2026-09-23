import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {startDirectTentacleCalculator} from '../website/dist/tentacle.mjs';
import {calculateDirectTentacleCommand} from '../engine/tentacle-direct-command.mjs';

test('general direct Tentacle view uses the shared command engine and fails closed',()=>{
  class Element{constructor(){this.children=[];this.textContent='';this.value='';this.hidden=false;}replaceChildren(...items){this.children=items;}}
  const nodes=new Map(),doc={getElementById(id){if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);},createElement(){return new Element();}};
  startDirectTentacleCalculator({calculateDirectTentacleCommand,runtimeFingerprint:'a'.repeat(64)},doc);
  nodes.get('example').onclick();
  assert.equal(nodes.get('total').textContent,'235');
  assert.deepEqual(nodes.get('stages').children.map(item=>item.textContent),['Player Tentacle damage: 230','Command effect after occupation mastery and ceiling: 106','Regional critical bonus (%): 84','Target pre-hit damage: 235']);
  assert.match(nodes.get('summary').textContent,/1 Awakener/);
  const input=JSON.parse(nodes.get('input').value);
  input.awakers.push({...input.awakers[0]});
  nodes.get('input').value=JSON.stringify({kind:'morimens-theorycraft-request',operation:'calculate-direct-tentacle-command',input});nodes.get('run').onclick();
  assert.equal(nodes.get('result').hidden,false);assert.match(nodes.get('summary').textContent,/2 Awakeners/);
  delete input.player.tentacle_dmg;
  nodes.get('input').value=JSON.stringify(input);nodes.get('run').onclick();
  assert.equal(nodes.get('result').hidden,true);assert.match(nodes.get('error').textContent,/Exact finite Player properties required/);
  const page=readFileSync(new URL('../website/dist/tentacle.html',import.meta.url),'utf8');
  assert.match(page,/tentacle-bootstrap\.mjs/);assert.match(page,/final damage is withheld/i);
});
