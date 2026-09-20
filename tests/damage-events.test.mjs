import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runDamageEvents} from '../engine/damage-events.mjs';
const data=JSON.parse(readFileSync(new URL('./synthetic/original-damage-events.json',import.meta.url)));
test('damage event ordering and live HP recheck match 35 original executions',()=>{
  for(const {input:v,expected} of data.fixtures){
    const trace=[];let hp=v.hp;
    const payload={damageType:v.category,isPreventActiveDamage:v.prevented,pvp_death_resist:v.deathResist,isCrit:v.crit};
    runDamageEvents({payload,isBattleFinished:()=>v.battleFinished,
      emit:(name,p)=>{assert.equal(p,payload);trace.push(name);},
      checkDeath:(_caster,_cmd,_reason,p)=>{assert.equal(p,payload);trace.push('CheckDeathEvent');if(v.hpAfterDeathCheck!==null)hp=v.hpAfterDeathCheck;},
      getHp:()=>hp,isFightBack:()=>v.fightBack});
    assert.deepEqual({trace,hpAfter:hp},expected,JSON.stringify(v));
  }
});
test('death adapter receives source metadata and kill check uses its updated HP',()=>{
  const payload={damageType:'Active',castRoleUid:9,fromCmdServerUid:11,hpChangeReason:3,isCrit:true};
  let hp=0;const events=[];
  runDamageEvents({payload,isBattleFinished:()=>false,emit:name=>events.push(name),
    checkDeath:(caster,cmd,reason,p)=>{assert.deepEqual([caster,cmd,reason],[9,11,3]);assert.equal(p,payload);hp=25;},
    getHp:()=>hp,isFightBack:()=>false});
  assert.deepEqual(events,['DoDamage','BeDamage']);
});
