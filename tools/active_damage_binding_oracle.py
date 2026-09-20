"""Original per-target active damage method with observable live parameter adapter."""
import ctypes as C
import json
from target_runtime_oracle import TargetOracle, ROOT

class ActiveBindingOracle(TargetOracle):
    def __init__(self):
        super().__init__()
        self.rawseti=self.lib.lua_rawseti
        self.rawseti.argtypes=[C.c_void_p,C.c_int,C.c_longlong];self.rawseti.restype=None
        self.lib.lua_toboolean.argtypes=[C.c_void_p,C.c_int];self.lib.lua_toboolean.restype=C.c_int
        def require(s):
            name=self.string(s,1,None)
            known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc'}
            if name in known:self.getglobal(s,known[name])
            elif name==b'Battle.DbgEngine.Effect.BattleEffectServer':self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(self.state,b'require')
        self.module('BEActiveDamage');self.setglobal(self.state,b'_binding_active')
        if self.errors:raise RuntimeError(self.errors)

    def run(self,v):
        L=self.state;self.top(L,0);self.errors.clear();events=[];attacks=[]
        self.table(L,0,8)
        self.number(L,11);self.setfield(L,-2,b'cmdServerUid')
        self.number(L,0);self.setfield(L,-2,b'damageSubType')
        self.number(L,7.5);self.setfield(L,-2,b'paraPlus')
        def params(s):
            try:
                events.append('GenParams')
                self.table(s,1,0);self.number(s,self.current);self.rawseti(s,-2,1);self.setfield(s,1,b'params')
            except Exception as error:self.errors.append(str(error))
            return 0
        self.method('GenParams',params)
        self.table(L,0,4);self.number(L,9);self.setfield(L,-2,b'castRoleUid')
        def real(s):
            events.append({'GetRealDmg':self.tonumber(s,2,None),'paraPlus':self.tonumber(s,5,None)})
            self.number(s,self.tonumber(s,2,None));return 1
        def member(s):self.boolean(s,v['crit']);return 1
        self.method('GetRealDmg',real);self.method('GetMemberValue',member);self.setfield(L,-2,b'cmdServer')
        self.setglobal(L,b'_binding_effect')
        self.table(L,0,3)
        def dead(s):self.boolean(s,v['dead']);return 1
        def hit(s):
            try:
                self.getfield(s,2,b'damageVal');damage=self.tonumber(s,-1,None);self.top(s,-2)
                self.getfield(s,2,b'isCrit');crit=bool(self.lib.lua_toboolean(s,-1));self.top(s,-2)
                attacks.append({'damageVal':damage,'isCrit':crit});events.append('BeHit')
                self.table(s,0,1);self.number(s,-damage);self.setfield(s,-2,b'changeVal')
            except Exception as error:self.errors.append(str(error));self.table(s,0,0)
            return 1
        self.method('IsDead',dead);self.method('BeHit',hit);self.setglobal(L,b'_binding_target')
        for value in v['values']:
            self.current=value;self.top(L,0)
            self.getglobal(L,b'_binding_active');self.getfield(L,-1,b'Damage2SingleTarget')
            self.getglobal(L,b'_binding_effect');self.getglobal(L,b'_binding_target')
            self.check(self.call(L,2,0,0,0,None))
            if self.errors:raise RuntimeError(self.errors)
        return {'events':events,'attacks':attacks}

if __name__=='__main__':
    o=ActiveBindingOracle()
    cases=[{'values':values,'dead':dead,'crit':crit} for values in [[1.25,8.75],[-4,0,3.5]] for dead in [False,True] for crit in [False,True]]
    fixtures=[]
    for v in cases:
        result=o.run(v)
        expected_events=[] if v['dead'] else [event for value in v['values'] for event in ['GenParams',{'GetRealDmg':value,'paraPlus':7.5},'BeHit']]
        expected_attacks=[] if v['dead'] else [{'damageVal':max(0,value),'isCrit':v['crit']} for value in v['values']]
        assert result=={'events':expected_events,'attacks':expected_attacks}, (v,result)
        fixtures.append({'input':v,'expected':result})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{'BEActiveDamage':o.assets['BEActiveDamage.lua']['sha256']},
         'scope':'Original Damage2SingleTarget repeatedly invoked on one effect; GenParams supplies changing numeric base, GetRealDmg is an identity observer, BeHit records attack only. No real damage formula, HP mutation, command expression execution, scheduling, card or state-add variant.',
         'fixtures':fixtures}
    (ROOT/'tests/synthetic/original-active-damage-binding.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(cases),'original live-parameter binding cases')
