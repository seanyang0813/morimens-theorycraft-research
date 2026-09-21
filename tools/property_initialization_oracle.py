"""Original property constructor with no-op base constructor; numeric inputs only."""
import ctypes as C
import json
from hp_property_oracle import HpPropertyOracle, ROOT

class InitializationOracle(HpPropertyOracle):
    def __init__(self, asset_overrides=None):
        asset_overrides = asset_overrides or {}
        super().__init__(asset_overrides);L=self.state
        self.kind=self.lib.lua_type;self.kind.argtypes=[C.c_void_p,C.c_int];self.kind.restype=C.c_int
        def new_class(s):
            self.table(s,0,100);self.table(s,0,1)
            self.method('ctor',lambda _:0)
            return 2
        self.getglobal(L,b'_oracle_config_system');self.method('NewClass',new_class);self.top(L,0)
        self.module('BattlePropertyServer',asset_overrides.get('BattlePropertyServer'));self.setglobal(L,b'_initialization_property')

    def run(self,values):
        L=self.state;self.top(L,0)
        self.table(L,0,2);self.table(L,0,0);self.setfield(L,-2,b'data');self.table(L,0,0);self.setfield(L,-2,b'battleEngine');self.setglobal(L,b'_initialization_owner')
        self.table(L,0,0);self.setglobal(L,b'_initialization_self')
        self.getglobal(L,b'_initialization_property');self.getfield(L,-1,b'ctor');self.getglobal(L,b'_initialization_self');self.getglobal(L,b'_initialization_owner')
        self.table(L,0,len(values))
        for key,value in values.items():self.number(L,value);self.setfield(L,-2,key.encode())
        self.check(self.call(L,3,0,0,0,None));self.top(L,0)
        result={}
        self.getglobal(L,b'_initialization_self');self.getfield(L,-1,b'properties')
        for key in sorted(set(values)|{'occupation_master_final'}):
            self.getfield(L,-1,key.encode())
            if self.kind(L,-1)==3:result[key]=self.tonumber(L,-1,None)
            self.top(L,-2)
        if self.errors:raise RuntimeError(self.errors)
        return result

if __name__=='__main__':
    o=InitializationOracle();cases=[]
    for master in [0,0.25,72,100.1]:
        for percent in [0,50.25,100]:
            for final in [None,7.25]:
                values={'occupation_master':master,'occupation_master_final_per':percent,'hp':99.25,'block':-0.25}
                if final is not None:values['occupation_master_final']=final
                cases.append({'input':values,'expected':o.run(values)})
    report={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original BattlePropertyServer.ctor with no-op Super.ctor, supplied owner/data/engine tables, numeric property map. Does not execute role constructors or any post-construction mutation.','sourceHash':o.assets['BattlePropertyServer.lua']['sha256'],'fixtures':cases}
    (ROOT/'tests/synthetic/original-property-initialization.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(cases),'original numeric property initialization cases')
