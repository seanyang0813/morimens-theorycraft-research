import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {enqueueCommandRows} from '../engine/command-rows.mjs';
import {enqueueActiveDamage} from '../engine/active-damage-command.mjs';
import {ResearchEffectOrder} from '../engine/effect-order.mjs';
const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-old-embers-expressions.json',import.meta.url)));
function run(input,{blockAfterHp=false,attached=false}={}){
  const scheduler=new ResearchEffectOrder(),layers={80575:input.layers,80593:0,80594:0,66314:input.blocker,62317:0},trace=[];
  const handlers={};
  for(const type of ['BEAddState','BERemoveState','BESubStateLayer','BEChangeAttr.hp'])handlers[type]=({rowId,parameters})=>{
    trace.push({row:Number(rowId),type,params:parameters});
    if(type==='BEAddState')layers[parameters[0]]=1;
    if(type==='BERemoveState')layers[parameters[0]]=0;
    if(type==='BESubStateLayer')layers[parameters[0]]=Math.max(0,layers[parameters[0]]-Math.ceil(Math.abs(parameters[1])));
    if(type==='BEChangeAttr.hp'&&blockAfterHp)scheduler.enqueue(()=>{layers[66314]=1;},{attached});
    return null;
  };
  const report=enqueueCommandRows({scheduler,rows:evidence.commands[input.commandId],allowedFunctions:['UpperTarget.GetStateLayer'],
    readVariable:name=>{assert.equal(name,'Arg1');return input.argument;},callFunction:(name,args)=>layers[args[0]],
    resolveTargets:selector=>{assert.equal(selector,'UpperTarget');return ['target'];},handlers,canContinue:()=>true});
  scheduler.run();return {report,trace,layersAfter:layers[80575]};
}
test('generic rows reproduce original expression-driven Old Embers sequences',()=>{
  for(const {input,expected} of evidence.fixtures){const result=run(input);assert.deepEqual({trace:result.trace,layersAfter:result.layersAfter},expected);assert.equal(result.report.completed,true);}
});
test('later conditions see ordinary descendants while attached effects retain root placement',()=>{
  const input={commandId:80572,layers:10,argument:3,blocker:0};
  const ordinary=run(input,{blockAfterHp:true}),attached=run(input,{blockAfterHp:true,attached:true});
  assert.equal(ordinary.layersAfter,10);assert.equal(attached.layersAfter,7);
  assert.equal(ordinary.report.trace.find(row=>row.rowId==='4').executed,false);
});
test('generic damage handler preserves live per-hit parameter evaluation',()=>{
  const scheduler=new ResearchEffectOrder();let base=10;
  const report=enqueueCommandRows({scheduler,rows:[{id:'hit',Type:'BEActiveDamage',Target:'UpperTarget',Para:'Arg1,3',Cond:'Arg1>0'}],
    readVariable:()=>base,resolveTargets:()=>['enemy'],canContinue:()=>true,
    handlers:{BEActiveDamage:({parameters,readParameters,scheduler})=>enqueueActiveDamage({scheduler,initialParameters:parameters,plus:0,per:0,
      isTargetDead:()=>false,readParameters,resolveDamage:value=>value,readCrit:()=>false,
      applyHit:()=>{scheduler.enqueue(()=>{base+=5;});return null;}})}});
  scheduler.run();assert.deepEqual(report.trace[0].result.trace.map(hit=>hit.attack.damageVal),[10,15,20]);
  assert.equal(report.trace[0].parameterEvaluations.length,4);assert.equal(report.completed,true);
});
test('all row syntax and handlers validate before any command runs',()=>{
  const scheduler=new ResearchEffectOrder();let calls=0;
  const options={scheduler,rows:[{id:'a',Type:'known',Target:'target',Para:1},{id:'b',Type:'unknown',Target:'target',Para:1}],resolveTargets:()=>[],canContinue:()=>true,handlers:{known:()=>calls++}};
  assert.throws(()=>enqueueCommandRows(options));scheduler.run();assert.equal(calls,0);
});
