"""Original effect iteration -> original BeHit -> original HP mutation, in one Lua state."""
import ctypes as C
import json
from behit_hp_oracle import BeHitHpOracle, ROOT

class EffectHpOracle(BeHitHpOracle):
    def __init__(self):
        super().__init__()
        L=self.state
        self.rawseti=self.lib.lua_rawseti
        self.rawseti.argtypes=[C.c_void_p,C.c_int,C.c_longlong]
        self.rawseti.restype=None
        def require(s):
            name=self.string(s,1,None)
            known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.DbgEngine.Effect.BattleEffectServer':b'_effect_base'}
            if name in known:self.getglobal(s,known[name])
            elif name==b'Battle.Ecs.BattleEntity':self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require')
        self.module('BattleEffectServer');self.setglobal(L,b'_effect_base')
        for category in ['Passive','Fixed','Pure']:
            self.module('BE'+category+'Damage');self.setglobal(L,('_effect_'+category).encode())
        self.getglobal(L,b'_behit_unit')
        def dead(s):self.boolean(s,False);return 1
        self.method('IsDead',dead)
        self.getfield(L,-1,b'battleEngine');self.getfield(L,-1,b'recordMgr')
        def record(s):
            self.pushvalue(s,3);self.setglobal(s,b'_effect_hit_result')
            return 0
        self.method('OnBeHit',record);self.top(L,0)
        if self.errors:raise RuntimeError(self.errors)

    def invoke_attack(self,v):
        L=self.state;self.top(L,0)
        self.nil(L);self.setglobal(L,b'_effect_hit_result')
        self.table(L,0,8)
        self.number(L,1);self.setfield(L,-2,b'leftEffectTimes')
        self.number(L,11);self.setfield(L,-2,b'cmdServerUid')
        self.table(L,4,0)
        # Passive/Fixed parameter 3 is the damage subtype; Pure parameter 3 is includeStats.
        for i,value in enumerate([v['damage'],1,1 if v['damageType']=='Pure' else int(v['puncture']),0],1):
            self.number(L,value);self.rawseti(L,-2,i)
        self.setfield(L,-2,b'params')
        self.table(L,0,1);self.number(L,9);self.setfield(L,-2,b'castRoleUid');self.setfield(L,-2,b'cmdServer')
        for name in ['CalFinalVal','GetDamageSubType']:
            self.getglobal(L,b'_effect_base');self.getfield(L,-1,name.encode());self.setfield(L,-3,name.encode());self.top(L,-2)
        def dimension(s):self.number(s,v['dimensionFixPer']);return 1
        self.method('GetDimensionFixPer',dimension)
        self.table(L,1,0);self.getglobal(L,b'_behit_unit');self.rawseti(L,-2,1);self.setfield(L,-2,b'targets')
        self.setglobal(L,b'_effect_self')
        self.getglobal(L,('_effect_'+v['damageType']).encode());self.getfield(L,-1,b'__DoMultiEffect');self.getglobal(L,b'_effect_self')
        self.check(self.call(L,1,1,0,0,None))
        self.top(L,0);self.getglobal(L,b'_effect_hit_result')
        if self.kind(L,-1)!=5:raise RuntimeError('Expected one recorded hit for a living target and positive base')
        if self.errors:raise RuntimeError(self.errors)

if __name__=='__main__':
    oracle=EffectHpOracle()
    base=dict(damage=101.1,block=0,puncture=False,hp=1000,immune=False,preventEligible=False,retainHp=0,limit=0,usedLimit=0,deathResist=0,dimensionFixPer=25)
    changes=[{},dict(block=100),dict(block=1000),dict(immune=True),dict(limit=90,usedLimit=70),dict(hp=10),dict(hp=10,deathResist=1)]
    fixtures=[]
    for category in ['Passive','Fixed','Pure']:
        props=({'be_passive_damage_per':50,'be_passive_damage_per2':20,'be_passive_damage_per3':-10} if category=='Passive' else {f'be_fixed_damage_per{i}':p for i,p in enumerate([50,20,-10,15,25],1)} if category=='Fixed' else {})
        variants=changes+([dict(block=100,puncture=True),dict(block=100,immune=True,puncture=True)] if category!='Pure' else [])
        for change in variants:
            v={**base,**change,'damageType':category,'effectProperties':props}
            fixtures.append({'input':v,'expected':oracle.evaluate(v)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'One original __DoMultiEffect iteration directly calls original BeHit and original HP property mutation in one Lua state. Explicit living target, ordinary/Puncture subtypes (Pure ordinary only), property/dimension adapters. No scheduler, state reconstruction, record statistics, animation or damage-event execution.','sourceHashes':{n:oracle.assets[n+'.lua']['sha256'] for n in ['BEPassiveDamage','BEFixedDamage','BEPureDamage','BattleEffectServer','BattleUnitBase','BattleUnitUtil','BattlePropertyServer']},'fixtures':fixtures}
    (ROOT/'tests/synthetic/original-effect-hp.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(fixtures),'connected original effect/HP cases')
