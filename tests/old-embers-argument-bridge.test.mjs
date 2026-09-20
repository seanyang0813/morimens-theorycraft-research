import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runResearchTimeline} from '../engine/research-timeline.mjs';
const evidence=JSON.parse(readFileSync(new URL('./synthetic/original-old-embers-argument-bridge.json',import.meta.url)));
test('hit-to-state composition preserves original Arg1 fallback including half-integer values',()=>{
  for(const {input:i,argument,trigger} of evidence.fixtures){
    const build=evidence.build,damageType=i.damageType.toUpperCase();
    const scenario={build,mode:'experimental',damageType};
    if(damageType==='PASSIVE')scenario.passive={build,targetDead:false,baseDamage:i.damage,dimensionFixPer:0,passive1:0,passive2:0,passive3:0};
    else scenario.effect={build,category:damageType,targetDead:false,baseDamage:i.damage,dimensionFixPer:0,fixed1:0,fixed2:0,fixed3:0,fixed4:0,fixed5:0};
    const result=runResearchTimeline({schemaVersion:1,build,interveningEffects:'old-embers-only-assumed',target:{hp:i.hp,block:i.block},oldEmbersLayers:1000,steps:[{id:'hit',immune:i.immune,puncture:false,scenario}]});
    const row=result.trace[0];
    assert.equal(row.hit.result.hitTriggerValues.castDamage,trigger.trigger.triggerValue);
    assert.equal(row.generatedEffects.find(x=>x.effect.row===4).effect.rawAmount,argument);
    assert.equal(row.generatedEffects.find(x=>x.effect.row===3).effect.rawValue,-3*argument);
  }
  assert.ok(evidence.fixtures.some(x=>x.argument===0.5));
  assert.ok(evidence.fixtures.some(x=>x.argument===1.5));
});
