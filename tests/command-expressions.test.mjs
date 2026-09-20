import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileNumericCommand} from '../engine/command-expressions.mjs';
import {resolveCommandArgument} from '../engine/command-arguments.mjs';
import {enqueueActiveDamage} from '../engine/active-damage-command.mjs';
import {ResearchEffectOrder} from '../engine/effect-order.mjs';
test('supported numeric expressions agree with original compiled closures',()=>{
  const data=JSON.parse(readFileSync(new URL('./synthetic/original-numeric-command-expressions.json',import.meta.url)));
  for(const {input,expected} of data.fixtures){
    const result=compileNumericCommand(input.expression)(name=>name.split('.').reduce((object,key)=>object?.[key],input.environment));
    assert.deepEqual(result.values,expected);
  }
});
test('precedence, unary minus, lists and division preserve numeric order',()=>{
  assert.deepEqual(compileNumericCommand('-(2+3)*4, 8/2/2, 1e-2 + .5, 1- -2')().values,[-20,2,.51,3]);
  assert.deepEqual(compileNumericCommand(0)().values,[0]);
});
test('unknown values and unsupported Lua syntax cannot silently execute or default',()=>{
  for(const expression of ['math.ceil(Arg1)','a > 1','a and b','a^2','1--2','1,','a; b','true','[1]','1..2','1e999'])assert.throws(()=>compileNumericCommand(expression));
  for(const expression of ['missing','1/0'])assert.throws(()=>compileNumericCommand(expression)(()=>undefined));
});
test('command expression and Arg fallback connect to scheduled hits using current state',()=>{
  let power=10;const scheduler=new ResearchEffectOrder(),evaluate=compileNumericCommand('Arg1,3,0,ParaPlus1'),reads=[];
  const readVariable=name=>name==='ParaPlus1'?7.5:resolveCommandArgument({index:1,skillArgs:[],readFallback:()=>[power]}).value;
  const readParameters=()=>{const result=evaluate(readVariable);reads.push(result.reads);return result.values;};
  const report=enqueueActiveDamage({scheduler,initialParameters:readParameters(),plus:0,per:0,isTargetDead:()=>false,readParameters,
    resolveDamage:(value,bonus)=>value+bonus,readCrit:()=>false,
    applyHit:()=>{scheduler.enqueue(()=>{power+=5;});return null;}});
  scheduler.run();assert.deepEqual(report.trace.map(hit=>hit.attack.damageVal),[17.5,22.5,27.5]);
  assert.deepEqual(reads.map(list=>list[0].value),[10,10,15,20]);
});
test('allowlisted state queries match original compiled skill expression and query order',()=>{
  const data=JSON.parse(readFileSync(new URL('./synthetic/original-state-query-expressions.json',import.meta.url)));
  for(const {input,expected} of data.fixtures){
    const evaluate=compileNumericCommand(input.expression,{allowedFunctions:['CmdCaster.GetStateLayer']});
    const result=evaluate(name=>input.variables[name],(name,args)=>{
      assert.equal(name,'CmdCaster.GetStateLayer');assert.equal(args.length,1);return input.layers[args[0]];
    });
    assert.deepEqual(result.values,expected.values);assert.deepEqual(result.calls,expected.calls);
  }
});
test('function binding remains explicit, numeric, nested and live',()=>{
  const options={allowedFunctions:['state','scale']};let layer=2;
  const evaluate=compileNumericCommand('scale(state(7), 3), state(7)',options);
  const bind=(name,args)=>name==='state'?layer:args[0]*args[1];
  assert.deepEqual(evaluate(undefined,bind).values,[6,2]);layer=5;
  assert.deepEqual(evaluate(undefined,bind).values,[15,5]);
  assert.throws(()=>evaluate());assert.throws(()=>evaluate(undefined,()=>undefined));
  assert.throws(()=>compileNumericCommand('unknown(1)',options));
  assert.throws(()=>compileNumericCommand('state(1,)',options));
  assert.throws(()=>compileNumericCommand('state(1).x',options));
});
test('scheduled state query sees child changes before the next hit',()=>{
  const scheduler=new ResearchEffectOrder();let layers=0;
  const expression=compileNumericCommand('100*(1+CmdCaster.GetStateLayer(7)/100),3',{allowedFunctions:['CmdCaster.GetStateLayer']});
  const readParameters=()=>expression(undefined,()=>layers).values;
  const report=enqueueActiveDamage({scheduler,initialParameters:readParameters(),plus:0,per:0,isTargetDead:()=>false,readParameters,
    resolveDamage:value=>value,readCrit:()=>false,applyHit:()=>{scheduler.enqueue(()=>{layers+=50;});return null;}});
  scheduler.run();assert.deepEqual(report.trace.map(hit=>hit.attack.damageVal),[100,150,200]);
});
