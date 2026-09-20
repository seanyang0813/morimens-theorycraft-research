"""Original ordinary active-effect initialization; superclass and execution observed."""
import json
import ctypes as C
from active_damage_binding_oracle import ActiveBindingOracle, ROOT

class InitializationOracle(ActiveBindingOracle):
    def __init__(self):
        super().__init__(); L=self.state
        self.kind=self.lib.lua_type;self.kind.argtypes=[C.c_void_p,C.c_int];self.kind.restype=C.c_int
        def new_class(s):
            self.table(s,0,20);self.table(s,0,1)
            self.method('DoEffect',lambda state:0)
            return 2
        self.getglobal(L,b'_oracle_config_system');self.method('NewClass',new_class);self.top(L,0)
        self.module('BEActiveDamage');self.setglobal(L,b'_initialization_active')

    def run_init(self,v):
        L=self.state;self.top(L,0);self.errors.clear();self.calls=0
        self.table(L,0,10)
        if v['targetsPresent']:self.table(L,0,0);self.setfield(L,-2,b'targets')
        self.table(L,4,0)
        for index,value in enumerate([12.5,v['repeat'],0,7.5],1):
            if value is not None:self.number(L,value);self.rawseti(L,-2,index)
        self.setfield(L,-2,b'params')
        self.table(L,0,1);self.number(L,9);self.setfield(L,-2,b'castRoleUid');self.setfield(L,-2,b'cmdServer')
        self.table(L,0,1)
        def obj(s):
            self.table(s,0,1)
            def prop(state):
                key=self.string(state,2,None).decode()
                if key not in ['damagetimes_plus','damagetimes_per']:self.errors.append(key);self.number(state,0)
                else:self.number(state,v['plus' if key=='damagetimes_plus' else 'per'])
                return 1
            self.method('GetProperty',prop);return 1
        self.method('GetObj',obj);self.setfield(L,-2,b'battleEngine')
        self.getglobal(L,b'_initialization_active');self.getfield(L,-1,b'GetDamageSubTypeValue');self.setfield(L,-3,b'GetDamageSubTypeValue');self.top(L,-2)
        def subtype(s):self.pushvalue(s,2);return 1
        def execute(s):self.calls+=1;self.boolean(s,True);return 1
        self.method('GetDamageSubType',subtype);self.method('DoMultiEffect',execute)
        self.setglobal(L,b'_initialization_subject')
        self.getglobal(L,b'_initialization_active');self.getfield(L,-1,b'DoEffect');self.getglobal(L,b'_initialization_subject')
        self.check(self.call(L,1,1,0,0,None));self.top(L,0)
        self.getglobal(L,b'_initialization_subject');result={'executionCalls':self.calls}
        for field in ['totalEffectTimes','leftEffectTimes','paraPlus','damageSubType']:
            self.getfield(L,-1,field.encode());result[field]=None if self.kind(L,-1)==0 else self.tonumber(L,-1,None);self.top(L,-2)
        if self.errors:raise RuntimeError(self.errors)
        return result

if __name__=='__main__':
    o=InitializationOracle()
    cases=[dict(repeat=r,plus=p,per=m,targetsPresent=True) for r in [None,-1,0,.25,1,1.2,3] for p in [-1,0,.5,2] for m in [-150,-50,0,25]]
    cases.append(dict(repeat=3,plus=0,per=0,targetsPresent=False))
    report={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51',
            'sourceHashes':{'BEActiveDamage':o.assets['BEActiveDamage.lua']['sha256']},
            'scope':'Original DoEffect and GetDamageSubTypeValue, ordinary variant. Supplied params, caster property getters, no-op superclass, subtype identity and DoMultiEffect observer. Empty target table is present; no hit execution, scheduler or gameplay.',
            'fixtures':[{'input':v,'expected':o.run_init(v)} for v in cases]}
    (ROOT/'tests/synthetic/original-active-damage-initialization.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(cases),'original initialization cases')
