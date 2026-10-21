import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runDamageWorksheet} from '../engine/damage-worksheet.mjs';
const read=name=>JSON.parse(readFileSync(new URL(`../research/examples/damage-worksheet-${name}.json`,import.meta.url)));

test('visible Rotan arithmetic reproduces the screenshot while expectation retains both branches',()=>{
  const input=read('visible-rotan'),before=structuredClone(input),result=runDamageWorksheet(input);
  assert.deepEqual(input,before);assert.equal(result.evaluatedCells,16);
  const row=result.setups[0].grid.find(row=>row.rowValue===100&&row.columnValue===220);
  assert.equal(row.noncritical,8357);assert.equal(row.critical,26743);assert.ok(Math.abs(row.expected-22072.956)<1e-8);assert.equal(row.passes,true);
  for(const [strength,shown] of [[100,19950],[500,24725],[1000,30693]]){
    const precritical=Math.ceil(1158*2.864*1.692*1.4)+5*strength;
    assert.equal(Math.ceil(precritical*.746*3.2),shown);
    const cell=result.setups[0].grid.find(row=>row.rowValue===strength&&row.columnValue===220);
    assert.ok(cell.expected>shown);assert.equal(cell.expected,.254*cell.noncritical+.746*cell.critical);
  }
  assert.equal(result.finalDamage,null);assert.equal(result.gameplayClear,null);
});

test('unknown crit probability preserves conditional branches and withholds an expected threshold',()=>{
  const input=read('tentacle');input.threshold={metric:'expected',value:1000};
  const row=runDamageWorksheet(input).setups[0].grid[0];
  assert.equal(row.noncritical,1500);assert.equal(row.critical,3000);assert.equal(row.expected,null);assert.equal(row.passes,null);
  for(const p of [0,1]){input.setups[0].criticalProbability=p;const c=runDamageWorksheet(input).setups[0].grid[0];assert.equal(c.expected,p?3000:1500);}
});

test('two-axis grid exposes base-only percentage versus flat STR and preserves changed setup inputs',()=>{
  const input=read('active');const clone=structuredClone(input.setups[0]);clone.id='different-build-inputs';clone.scenario.target.vulnerablePer=30;input.setups.push(clone);
  const result=runDamageWorksheet(input);assert.equal(result.evaluatedCells,40);
  assert.deepEqual(result.setups[1].differencesFromBaseline,[{path:'target.vulnerablePer',baseline:0,candidate:30}]);
  const cell=result.setups[0].grid.find(row=>row.rowValue===1000&&row.columnValue===200);assert.equal(cell.noncritical,4000);
});

test('worksheet refuses unsafe axes, missing scales, mixed builds, unsupported metrics and oversized grids',()=>{
  const bad=mutate=>{const input=read('active');mutate(input);assert.throws(()=>runDamageWorksheet(input));};
  bad(x=>x.rowAxis.path='offense.__proto__');bad(x=>x.rowAxis.path='offense.notKnown');bad(x=>delete x.rowAxis.scale);
  bad(x=>x.rowAxis.path=x.columnAxis.path);bad(x=>x.setups[0].criticalProbability=1.01);
  bad(x=>x.setups[0].scenario.build='pc-res153-build51');bad(x=>x.threshold.metric='WIN_RATE');
  bad(x=>{x.rowAxis.values=Array.from({length:501},(_,i)=>i);});
});
