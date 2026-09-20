"""Original unit layer-limit methods with explicit one-entry rule/property adapters."""
import ctypes as C
import itertools
import json
from behit_hp_oracle import BeHitHpOracle, ROOT

class LimitOracle(BeHitHpOracle):
    def __init__(self):
        super().__init__();self.rawset=self.lib.lua_rawseti;self.rawset.argtypes=[C.c_void_p,C.c_int,C.c_longlong];self.rawset.restype=None
    def limit(self,v):
        L=self.state;self.top(L,0);trace=[]
        self.getglobal(L,b'_oracle_bc')
        for family,prop in [('StateLayerLimit','limit'),('StateLayerLimitTotal','limit'),('StateLayerStatics','used')]:
            self.table(L,1,0);self.pushstring(L,prop.encode());self.rawset(L,-2,1);self.setfield(L,-2,family.encode())
        self.top(L,0);self.table(L,0,2)
        def prop(s):
            name=self.string(s,2,None).decode();trace.append(name);self.number(s,v[name]);return 1
        self.method('GetProperty',prop);self.table(L,0,3)
        self.table(L,0,1);self.table(L,0,1);self.table(L,0,1);self.pushstring(L,b'ids');self.setfield(L,-2,b'Data');self.setfield(L,-2,b'limit');self.setfield(L,-2,b'BattleApi');self.setfield(L,-2,b'battleDT')
        def ids(s):self.number(s,2669 if v['matching'] else 7);return 1
        def func(s):self.callback(ids);return 1
        self.method('GetCmdFunc',func);self.table(L,0,1)
        def state(s):
            trace.append('currentState')
            if v['state']=='missing':self.nil(s);return 1
            self.table(s,0,2);self.boolean(s,v['state']=='deleted');self.setfield(s,-2,b'isDeleted');self.table(s,0,1);self.number(s,v['used']);self.setfield(s,-2,b'layer');self.setfield(s,-2,b'data');return 1
        self.method('GetState',state);self.setfield(L,-2,b'stateMgr');self.setfield(L,-2,b'battleEngine');self.setglobal(L,b'_limit_subject')
        self.getglobal(L,b'_behit_unit');self.getfield(L,-1,b'CalcStateLayerLimitTotal' if v['mode']=='total' else b'CalcStateLayerLimit');self.getglobal(L,b'_limit_subject');self.number(L,2669);self.number(L,v['layer']);self.check(self.call(L,3,1,0,0,None))
        if self.errors:raise RuntimeError(self.errors)
        return {'layer':self.tonumber(L,-1,None),'trace':trace}
if __name__=='__main__':
    o=LimitOracle();fixtures=[]
    for mode,matching,limit,used,layer,state in itertools.product(['statistics','total'],[False,True],[-1,0,2.2,5],[0,1.5,9],[-2.2,0,4.2],['missing','deleted','live']):
        v=dict(mode=mode,matching=matching,limit=limit,used=used,layer=layer,state=state);fixtures.append({'input':v,'expected':o.limit(v)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{'BattleUnitBase':o.assets['BattleUnitBase.lua']['sha256']},'scope':'432 original CalcStateLayerLimit/Total cases. Synthetic one-entry BC rule/state mapping, supplied property values and state lookup. No property derivation/statistics updates, multi-rule ordering, AddState pipeline or gameplay.','fixtures':fixtures}
    (ROOT/'tests/synthetic/original-state-layer-limits.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Generated',len(fixtures),'original state layer limit cases')
