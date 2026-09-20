"""Original shield/retained-HP/limit helpers, not full BeHit callbacks."""
import ctypes as C
import json
import random
from target_runtime_oracle import TargetOracle, ROOT

class HitLimitsOracle(TargetOracle):
    def __init__(self):
        super().__init__();L=self.state
        self.toboolean=self.lib.lua_toboolean;self.toboolean.argtypes=[C.c_void_p,C.c_int];self.toboolean.restype=C.c_int
        def require(s):
            name=self.string(s,1,None)
            if name==b'Battle.BattleConst':self.getglobal(s,b'_oracle_bc')
            elif name==b'Battle.DbgEngine.Event.BattleLogicEvent':self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('BattleUnitUtil');self.setglobal(L,b'_hit_util')
        self.table(L,0,1)
        def prop(s):
            mapping={b'be_damage_limit':'limit',b'be_damage_statics':'usedLimit',b'pvp_death_resist':'deathResist',b'PreventBeActiveDamageRetainHP':'retainHp'}
            key=self.string(s,2,None)
            if key not in mapping:self.errors.append(repr(key));self.number(s,0)
            else:self.number(s,self.values[mapping[key]])
            return 1
        self.method('GetProperty',prop);self.setglobal(L,b'_hit_unit')
    def function(self,name):
        self.top(self.state,0);self.getglobal(self.state,b'_hit_util');self.getfield(self.state,-1,name.encode())
    def evaluate(self,v):
        self.values=v;self.errors=[];L=self.state
        self.function('CalcBlockedDamage');self.number(L,v['damage'])
        if v['puncture']:
            self.getglobal(L,b'_oracle_bc');self.getfield(L,-1,b'DamageSubType');self.getfield(L,-1,b'Puncture');self.setglobal(L,b'_hit_subtype');self.top(L,-3);self.getglobal(L,b'_hit_subtype')
        else:self.nil(L)
        self.number(L,v['block']);self.check(self.call(L,3,6,0,0,None))
        shield=[self.tonumber(L,-6,None),self.tonumber(L,-5,None),self.tonumber(L,-4,None),bool(self.toboolean(L,-3)),bool(self.toboolean(L,-2)),self.tonumber(L,-1,None)]
        retained=shield[0];converted=0
        if v['preventEligible']:
            self.function('ApplyPreventBeActiveDamageRetainHp');self.getglobal(L,b'_hit_unit');self.number(L,retained);self.number(L,v['hp']);self.check(self.call(L,3,2,0,0,None));retained=self.tonumber(L,-2,None);converted=self.tonumber(L,-1,None)
        self.function('ApplyIncomingDamageLimitsBeforeHpLoss');self.getglobal(L,b'_hit_unit');self.number(L,retained);self.number(L,v['hp']);self.table(L,0,1);self.check(self.call(L,4,2,0,0,None))
        limited=self.tonumber(L,-2,None);death=bool(self.toboolean(L,-1))
        if self.errors:raise RuntimeError(self.errors)
        return dict(shield=shield,afterRetain=retained,converted=converted,hpLossRequest=limited,deathResistApplied=death)

if __name__=='__main__':
    o=HitLimitsOracle();base=dict(damage=100,block=0,puncture=False,hp=1000,preventEligible=False,retainHp=0,limit=0,usedLimit=0,deathResist=0);cases=[]
    for damage in [0,0.5,100,100.1]:
      for block in [0,50,100,150]:
       for puncture in [False,True]:cases.append({**base,'damage':damage,'block':block,'puncture':puncture})
    rng=random.Random(20260924)
    for _ in range(250):
        cases.append(dict(damage=rng.choice([1,50,100.1,500,1000]),block=rng.choice([0,50,500]),puncture=rng.choice([False,True]),hp=rng.choice([1,100,1000]),preventEligible=rng.choice([False,True]),retainHp=rng.choice([0,1,50,200]),limit=rng.choice([0,50,200]),usedLimit=rng.choice([0,20,100,500]),deathResist=rng.choice([0,1])))
    output={'scope':'Original BattleUnitUtil shield, retained-HP and incoming-limit helpers; explicit prevent eligibility; no immunity, property callbacks, HP mutation, events, statistics or death execution','sourceHash':o.assets['BattleUnitUtil.lua']['sha256'],'fixtures':[dict(input=v,expected=o.evaluate(v)) for v in cases]}
    (ROOT/'tests/synthetic/original-hit-limits.json').write_text(json.dumps(output,indent=2),encoding='utf-8');print('Generated',len(cases),'hit-helper cases')
