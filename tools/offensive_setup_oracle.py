"""Original __GetShowDamage + ShowDamageFormula with synthetic PvE getters.

No card instance. Supports explicit skill tags, caster/player properties and
dimension getter. Does not execute state application, target or HP logic.
"""
import ctypes as C
import json
import random
from target_runtime_oracle import TargetOracle, ROOT

class SetupOracle(TargetOracle):
    def __init__(self):
        super().__init__()
        self.rawseti=self.lib.lua_rawseti
        self.rawseti.argtypes=[C.c_void_p,C.c_int,C.c_longlong]
        self.rawseti.restype=None
        L=self.state
        def prop(which):
            def get(s):
                name=self.string(s,2,None)
                if name is None:
                    self.errors.append('Unmapped property requested')
                    self.number(s,0)
                else:
                    self.number(s,self.values[which].get(name.decode(),0))
                return 1
            return get
        for name,which in [(b'_setup_actor','caster'),(b'_setup_player','player')]:
            self.table(L,0,4)
            self.method('GetProperty',prop(which))
            self.method('IsRoleType',self.true)
            self.number(L,1);self.setfield(L,-2,b'camp')
            self.setglobal(L,name)
        self.table(L,0,1)
        def player(s):self.getglobal(s,b'_setup_player');return 1
        self.method('GetPlayer',player)
        self.setglobal(L,b'_setup_roles')
        self.table(L,0,5)
        self.getglobal(L,b'_setup_roles');self.setfield(L,-2,b'roleMgr')
        self.method('IsPVE',self.true)
        def false(s):self.boolean(s,0);return 1
        self.method('IsPVP',false)
        def obj(s):
            if self.tonumber(s,2,None)==1:self.getglobal(s,b'_setup_actor')
            else:self.nil(s)
            return 1
        self.method('GetObj',obj)
        def noop(s):return 0
        self.method('Debug',noop)
        self.setglobal(L,b'_setup_engine')
        self.table(L,0,8)
        self.getglobal(L,b'_setup_engine');self.setfield(L,-2,b'battleEngine')
        self.number(L,1);self.setfield(L,-2,b'castRoleUid')
        self.number(L,0);self.setfield(L,-2,b'cardUid')
        self.method('IsStateTriggerAdd',false)
        def tags(s):
            self.table(s,len(self.values['tags']),0)
            for i,t in enumerate(self.values['tags'],1):
                self.getglobal(s,b'_oracle_bc');self.getfield(s,-1,b'SkillType');self.getfield(s,-1,t.encode())
                self.setglobal(s,b'_setup_tag');self.top(s,-3)
                self.getglobal(s,b'_setup_tag');self.rawseti(s,-2,i)
            return 1
        self.method('GetSkillType',tags)
        for method,key in [('GetDimensionFixPer','dimensionFixPer'),('GetSkillArgsPlus','skillArgsPlus')]:
            def getter(s,key=key):self.number(s,self.values[key]);return 1
            self.method(method,getter)
        self.setglobal(L,b'_setup_self')
        self.top(L,0)

    def evaluate(self,data):
        self.values=data;self.errors.clear();L=self.state;self.top(L,0)
        self.getglobal(L,b'_oracle_cmd');self.getfield(L,-1,b'__GetShowDamage')
        self.getglobal(L,b'_setup_self');self.number(L,data['value'])
        self.nil(L);self.nil(L);self.nil(L)
        self.check(self.call(L,5,2,0,0,None))
        if self.errors:raise RuntimeError(self.errors)
        return [self.tonumber(L,-2,None),self.tonumber(L,-1,None)]

if __name__=='__main__':
    o=SetupOracle()
    base=dict(value=100,caster={},player={},tags=['Card_Strike'],dimensionFixPer=0,skillArgsPlus=0)
    cases=[base]
    for strength in [-20,0,20]:
        for stack in [0,1,2,4]:
            for tags in [['Card_Strike'],['Card_Skill','Card_Strike'],['Card_Strike','Card_AttachPost'],['Ulti_Skill']]:
                cases.append({**base,'tags':tags,'caster':{'i_damage_per_strikecard':25*stack,'o_damage_per_strikecard':35,'strikecard_damage_plus':653,'awaker_strength_multiple':50,'awaker_dmg_power_per_scale':20},'player':{'damage_plus':strength}})
    rng=random.Random(20260921)
    props=['damage_plus','awaker_strength_multiple','awaker_dmg_power_per_scale','o_damage_per','i_basic_damage_per','i_damage_per','i_damage_per3','only_damage_plus','i_damage_per_strikecard','o_damage_per_strikecard','damage_per_strikecard','i_damage_per_attachpost','o_damage_per_attachpost','damage_per_attachpost','strikecard_damage_plus','ulti_damage_plus','ulti_strength_multiple','awaker_ulti_BaseDmg_flat','awaker_PostAct_BaseDmg_flat','awaker_ulti_dmg_per']
    for _ in range(500):
        c={k:rng.choice([-25,0,0.1,10,25,50,100]) for k in rng.sample(props,8)}
        p={k:rng.choice([0,0.1,25,50]) for k in ['weak_per','enhance_per','basic_damage_per']}
        p['damage_plus']=rng.choice([-50,0,50,123])
        cases.append({**base,'value':rng.uniform(0,10000),'caster':c,'player':p,'tags':rng.choice([['Card_Strike'],['Card_Skill','Card_Strike'],['Card_Strike','Card_AttachPost'],['Ulti_Skill']]),'dimensionFixPer':rng.choice([0,25]),'skillArgsPlus':rng.choice([0,10])})
    fixtures=[{'id':f'setup-{i}','input':v,'expected':o.evaluate(v)} for i,v in enumerate(cases)]
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original offensive setup and utility; PvE Awakener; no card, ordinary subtype, not state-trigger-add; omitted synthetic properties explicitly neutral; no target/HP resolution','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleCmdServer','BattleUtilServer','BattleConst']},'fixtures':fixtures}
    (ROOT/'tests/synthetic/original-offensive-setup.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
    print('Generated',len(fixtures),'original offensive-setup observations; translation comparisons pending')
