import test from 'node:test';
import assert from 'node:assert/strict';
import {enqueueOldEmbersActivation} from '../engine/old-embers-activation.mjs';
import {ResearchEffectOrder} from '../engine/effect-order.mjs';
import {resolveHpAttributeLoss} from '../engine/hp-attribute-loss.mjs';

function run(category,{otherTarget=false,hidden=0,missingState=false,eventName=category==='Tentacle'?'AttackedByTentacle':'BeDamage'}={}){
  const scheduler=new ResearchEffectOrder(),owner={uid:7,camp:2},state={id:80575,uid:88,owner,ownerIsMonster:true};
  const layers={80575:100,80593:0,80594:0,66314:0,62317:0},trace=[];let hp=1000;
  const context={banned:false,relicSource:false,hidden,deleted:false,card:false,dead:false,prohibitDead:false,configured:true,commandExists:true,hasJudgment:false,targetType:'StateOwner',stateUid:88,castRoleUid:7};
  const hooks={getTime:()=>10,getSkillCastTime:()=>{},beforePhase:()=>trace.push('before'),timeline:()=>{},afterCreate:()=>scheduler.enqueue(()=>trace.push('after-create')),
    finish:()=>scheduler.enqueue(()=>trace.push('finish')),endPhase:()=>trace.push('end'),stateTriggerEnd:()=>trace.push('trigger-end'),missingState:()=>trace.push('missing-state')};
  const report=enqueueOldEmbersActivation({scheduler,eventName,event:{damageType:category,targetRoleUid:otherTarget?9:7,castDamage:5,realDamage:0,unBlockedDamage:0,blockedDamage:5,isCrit:false},
    target:otherTarget?{uid:9,camp:2}:owner,caster:{uid:1,camp:1},state,context,getState:()=>missingState?null:state,getStateLayer:id=>layers[id],canContinue:()=>!scheduler.finished,hooks,
    executeStep:step=>{
      trace.push('row'+step.row);
      if(step.type==='addState')layers[step.stateId]=step.layers;
      if(step.type==='removeState')layers[step.stateId]=0;
      if(step.type==='subtractState')layers[step.stateId]=Math.max(0,layers[step.stateId]-Math.ceil(Math.abs(step.rawAmount)));
      if(step.type==='changeHp')hp=resolveHpAttributeLoss({hp,rawValue:step.rawValue,immunity:0,limit:0}).result.hpAfter;
    }});
  scheduler.run();return {report,hp,layers,trace};
}
test('code-derived single activation connects category weighting and phase lifecycle',()=>{
  for(const category of ['Active','Passive','Fixed','Tentacle']){
    const r=run(category),half=['Passive','Fixed'].includes(category);
    assert.equal(r.hp,half?993:985);assert.equal(r.layers[80575],half?97:95);
    assert.equal(r.report.commandId,half?81060:80572);assert.equal(r.report.finalDamage,null);
    assert.deepEqual(r.trace,['before','row1','row3','row4','row7','row8','after-create','finish','end','trigger-end']);
  }
});
test('Pure, another target, hidden owner and wrong Tentacle event do not activate',()=>{
  for(const r of [run('Pure'),run('Active',{otherTarget:true}),run('Active',{hidden:1}),run('Tentacle',{eventName:'BeDamage'})]){
    assert.equal(r.report.activated,false);assert.equal(r.hp,1000);assert.equal(r.layers[80575],100);
  }
});
test('missing StateOwner resolves to no command-row HP loss',()=>{
  const r=run('Active',{missingState:true});assert.equal(r.hp,1000);assert.deepEqual(r.report.rows,[]);assert.ok(r.trace.includes('missing-state'));
});
