"""Original existing-state AddLayer mutation, attribution and callback ordering."""
import ctypes as C
import itertools
import json
from state_property_routing_oracle import RoutingOracle, ROOT

class AddLayerOracle(RoutingOracle):
    def __init__(self):
        super().__init__();self.rawget=self.lib.lua_rawgeti;self.rawget.argtypes=[C.c_void_p,C.c_int,C.c_longlong];self.rawget.restype=C.c_int
        self.kind=self.lib.lua_type;self.kind.argtypes=[C.c_void_p,C.c_int];self.kind.restype=C.c_int

    def merge(self,v):
        L=self.state;self.top(L,0);trace=[]
        self.table(L,0,15)
        for name,n in [('uid',88),('stateId',2669),('castRoleUid',7)]:self.number(L,n);self.setfield(L,-2,name.encode())
        self.table(L,0,1);self.number(L,11);self.setfield(L,-2,b'uid');self.setfield(L,-2,b'owner')
        self.table(L,0,1);self.number(L,7);self.setfield(L,-2,b'castRoleUid');self.setfield(L,-2,b'createArgs')
        self.table(L,0,3);self.number(L,v['before']);self.setfield(L,-2,b'layer');self.number(L,0);self.setfield(L,-2,b'changedLayer')
        self.table(L,0,1);self.number(L,2);self.rawseti(L,-2,7);self.setfield(L,-2,b'casterLayerList');self.setfield(L,-2,b'data')
        self.table(L,2,0)
        for i in [1,2]:
            self.table(L,0,2);self.number(L,i);self.setfield(L,-2,b'sourceType');self.number(L,i+1);self.setfield(L,-2,b'layer');self.rawseti(L,-2,i)
        self.setfield(L,-2,b'source')
        def caster(s):trace.append({'event':'resolveCaster'});self.number(s,99);return 1
        self.method('GetCasterUid',caster)
        for i in [1,3]:
            self.table(L,0,1)
            def update(s,i=i):trace.append({'event':'updateTriggerCaster','index':i,'caster':self.tonumber(s,2,None)});return 0
            self.method('UpdateCasterRoleUid',update);self.setfield(L,-2,('triggerCmd'+str(i)).encode())
        self.table(L,0,1);self.pushstring(L,b'max');self.setfield(L,-2,b'MaxLayer');self.setfield(L,-2,b'configData')
        self.table(L,0,1)
        def maxvalue(s):trace.append({'event':'maximum'});self.number(s,v['maximum']);return 1
        self.method('GetValueByCmd',maxvalue);self.setfield(L,-2,b'cmdServer')
        def args(s):trace.append({'event':'args'});self.table(s,0,0);self.table(s,0,0);return 2
        def properties(s):trace.append({'event':'propertyDelta','value':self.tonumber(s,2,None)});return 0
        def log(s):trace.append({'event':'log'});return 0
        def end(s):trace.append({'event':'lifeEnd'});return 0
        self.method('GetArgs',args);self.method('UpdatePropertyWhenLayerChanges',properties);self.method('LogBattleLayer',log);self.method('LifeEnd',end)
        self.table(L,0,1);self.table(L,0,1)
        def record(s):trace.append({'event':'record'});return 0
        self.method('OnChangeStateLayer',record);self.setfield(L,-2,b'recordMgr');self.setfield(L,-2,b'battleEngine');self.setglobal(L,b'_merge_state')
        self.getglobal(L,b'_routing_module');self.getfield(L,-1,b'AddLayer');self.getglobal(L,b'_merge_state');self.table(L,0,3)
        for key,name in [('add','layer'),('caster','castRoleUid')]:
            if v[key] is not None:self.number(L,v[key]);self.setfield(L,-2,name.encode())
        self.table(L,1,0);self.table(L,0,1);self.number(L,v['sourceType']);self.setfield(L,-2,b'sourceType');self.rawseti(L,-2,1);self.setfield(L,-2,b'source')
        self.check(self.call(L,2,0,0,0,None))
        def field(path):
            self.top(L,0);self.getglobal(L,b'_merge_state')
            for key in path:
                if isinstance(key,int):self.rawget(L,-1,key)
                else:self.getfield(L,-1,key.encode())
            return None if self.kind(L,-1)==0 else self.tonumber(L,-1,None)
        out={'layer':field(['data','layer']),'changedLayer':field(['data','changedLayer']),'caster':field(['castRoleUid']),'creationCaster':field(['createArgs','castRoleUid']),
             'casterLayers':{str(i):field(['data','casterLayerList',i]) for i in [7,9]},'sourceLayers':[field(['source',i,'layer']) for i in [1,2]],'trace':trace}
        if self.errors:raise RuntimeError(self.errors)
        return out

if __name__=='__main__':
    o=AddLayerOracle();fixtures=[]
    for before,maximum,add,caster,source in itertools.product([0,4,8],[4,4.2],[None,0,2,-6],[None,7,9],[1,3]):
        v=dict(before=before,maximum=maximum,add=add,caster=caster,sourceType=source);fixtures.append({'input':v,'expected':o.merge(v)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{'BattleStateServer':o.assets['BattleStateServer.lua']['sha256']},'scope':'Original existing-state AddLayer: layer/caster/source mutations and callback order. Explicit old caster 7, attribution map, two sources and cached triggers 1/3; supplied max expression and resolved command caster 99. Properties, records, arguments, logging and LifeEnd observed only. Direct negative-layer probes do not imply reachability through CreateState. No creation or gameplay.','fixtures':fixtures}
    (ROOT/'tests/synthetic/original-add-state-layer.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Generated',len(fixtures),'original existing-state merge cases')
