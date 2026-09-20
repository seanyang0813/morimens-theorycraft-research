import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {effectDeathCondition} from '../engine/effect-death-condition.mjs';
import {enqueueOldEmbersCommand} from '../engine/old-embers-command.mjs';
import {ResearchEffectOrder} from '../engine/effect-order.mjs';
const data=JSON.parse(readFileSync(new URL('./synthetic/original-effect-death-condition.json',import.meta.url)));
test('effect death predicate matches original runtime and rejection precedence',()=>{
  for(const {input,expected} of data.fixtures)assert.deepEqual(effectDeathCondition(input),expected,JSON.stringify(input));
});
test('code-derived Old Embers continuation rechecks owner death after HP descendants',()=>{
  for(const ignoreDead of [false,true]){
    const scheduler=new ResearchEffectOrder();
    const context={...data.fixtures[0].input,ignoreDead};
    const states={80575:10,80593:0,80594:0,66314:0,62317:0};
    const report=enqueueOldEmbersCommand({scheduler,argument:3,getStateLayer:id=>states[id],
      // Earlier TryDoEffect caster-presence guard remains separate from ignoreDead.
      canContinue:()=>!scheduler.finished&&context.casterExists&&effectDeathCondition(context).allowed,
      executeStep:step=>{
        if(step.type==='addState')states[step.stateId]=1;
        if(step.type==='removeState')states[step.stateId]=0;
        if(step.type==='subtractState')states[step.stateId]-=step.rawAmount;
        if(step.type==='changeHp')scheduler.enqueue(()=>{context.statePlayer='dead';});
      }});
    scheduler.run();
    assert.deepEqual(report.trace.map(s=>s.row),ignoreDead?[1,3,4,7,8]:[1,3]);
    assert.equal(states[80575],ignoreDead?7:10);
  }
});
