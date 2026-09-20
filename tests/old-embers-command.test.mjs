import test from 'node:test';
import assert from 'node:assert/strict';
import {enqueueOldEmbersCommand} from '../engine/old-embers-command.mjs';
import {ResearchEffectOrder} from '../engine/effect-order.mjs';
import {ResearchEventDispatcher} from '../engine/event-dispatch.mjs';
import {resolveHpAttributeLoss} from '../engine/hp-attribute-loss.mjs';

// Composition diagnostics, not original command executions or gameplay fixtures.
function simulate({attached=false,finish=false,immune=0,limit=0,stacks=10,argument=3}={}){
  const scheduler=new ResearchEffectOrder(),events=new ResearchEventDispatcher();
  const states={80575:stacks,80593:0,80594:0,66314:0,62317:0};let hp=100;
  const log=[];
  events.register('HpDown',()=>scheduler.enqueue(()=>{states[66314]=1;log.push('exclusion added');if(finish)scheduler.finishBattle();},{attached}),{eventPriority:0});
  const report=enqueueOldEmbersCommand({scheduler,argument,getStateLayer:id=>states[id],canContinue:()=>!scheduler.finished,
    executeStep:step=>{
      log.push('row '+step.row);
      if(step.type==='addState')states[step.stateId]+=step.layers;
      if(step.type==='removeState')states[step.stateId]=0;
      if(step.type==='subtractState')states[step.stateId]=Math.max(0,states[step.stateId]-Math.ceil(Math.abs(step.rawAmount)));
      if(step.type==='changeHp'){
        const loss=resolveHpAttributeLoss({hp,rawValue:step.rawValue,immunity:immune,limit}).result;hp=loss.hpAfter;
        for(const event of loss.events)scheduler.enqueue(()=>events.send(event.name,event));
      }
    }});
  scheduler.run();return {states,hp,log,report};
}
test('ordinary HP-event descendants can prevent the following stack-consumption row',()=>{
  const r=simulate();assert.equal(r.hp,91);assert.equal(r.states[80575],10);
  assert.deepEqual(r.log,['row 1','row 3','exclusion added','row 7','row 8']);
  assert.equal(r.report.finalDamage,null);
  assert.equal(r.report.command.completed,true);
  const skipped=r.report.command.trace.find(row=>row.rowId==='4');
  assert.equal(skipped.executed,false);assert.equal(skipped.condition.passed,false);
  assert.ok(skipped.condition.calls.some(call=>call.args[0]===66314&&call.value===1));
});
test('attached event effect runs after the command, so consumption occurs first',()=>{
  const r=simulate({attached:true});assert.equal(r.states[80575],7);
  assert.deepEqual(r.log,['row 1','row 3','row 4','row 7','row 8','exclusion added']);
});
test('immune HP loss emits no HpDown, while fractional limits preserve signed rounding',()=>{
  const immune=simulate({immune:1});assert.equal(immune.hp,100);assert.equal(immune.states[80575],7);
  const limited=simulate({limit:2.5,argument:1.5});assert.equal(limited.hp,97.5);assert.equal(limited.states[80575],10);
});
test('battle finish stops continuation and does not fabricate marker cleanup',()=>{
  const r=simulate({finish:true});assert.equal(r.states[80593],1);assert.equal(r.states[80575],10);
  assert.deepEqual(r.report.trace.map(s=>s.row),[1,3]);
});
