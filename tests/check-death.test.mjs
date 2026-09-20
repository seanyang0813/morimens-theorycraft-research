import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkDeathEvent} from '../engine/check-death.mjs';
import {runDamageEvents} from '../engine/damage-events.mjs';
import {runDeadlyDamage} from '../engine/deadly-damage.mjs';
import {ResearchEffectOrder} from '../engine/effect-order.mjs';
const data=JSON.parse(readFileSync(new URL('./synthetic/original-check-death.json',import.meta.url)));
test('death-check guards and effect configurations match original runtime',()=>{
  for(const {input:v,expected} of data.fixtures){
    let hp=v.hp;const created=[];
    checkDeathEvent({role:{uid:7,eligible:()=>v.eligible,hp:()=>hp,isDead:()=>v.dead},castRoleUid:9,fromCmdServerUid:11,hpChangeReason:3,
      loseHpConfig:v.withPayload?{castDamage:200,overflowDamage:75}:undefined,
      createEffect:c=>{created.push(c);if(v.healOnFirstCreate&&created.length===1)hp=25;}});
    assert.deepEqual(created,expected);
  }
});
test('code-derived ordinary scheduler composition distinguishes queued kill event from later revival',()=>{
  const scheduler=new ResearchEffectOrder();const trace=[];let hp=0;
  const payload={damageType:'Active',castRoleUid:9,fromCmdServerUid:11,hpChangeReason:3,castDamage:200,overflowDamage:75};
  scheduler.enqueue(()=>{
    runDamageEvents({payload,isBattleFinished:()=>false,getHp:()=>hp,isFightBack:()=>false,
      emit:name=>scheduler.enqueue(()=>trace.push(name)),
      checkDeath:(castRoleUid,fromCmdServerUid,hpChangeReason,loseHpConfig)=>checkDeathEvent({
        role:{uid:7,eligible:()=>true,hp:()=>hp,isDead:()=>false},castRoleUid,fromCmdServerUid,hpChangeReason,loseHpConfig,
        createEffect:config=>{
          if(config.effectType==='BERoleDeadlyDamage')scheduler.enqueue(()=>runDeadlyDamage({
            role:{hp:()=>hp,isDeathResist:()=>false,deathResist:()=>{},revivePopup:()=>0},floatingText:()=>trace.push('ReviveText'),
            emit:name=>scheduler.enqueue(()=>{trace.push(name);if(name==='RoleBeforeDeathResist')hp=25;})
          }),{immediateChildren:true});
          else scheduler.enqueue(()=>trace.push(hp>0?'DieSkippedAfterRevival':'DieRequested'));
        }
      })
    });
    trace.push('HitBodyFinished');
  });
  scheduler.run();
  assert.deepEqual(trace,['HitBodyFinished','DoDamage','BeDamage','RoleBeforeDeathResist','ReviveText','DieSkippedAfterRevival','ActiveDamageKill']);
  assert.equal(hp,25);
});
