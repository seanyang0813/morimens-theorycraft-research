"""Original property initialization/update/special maximum/routing with mutation observers."""
import ctypes as C
import itertools
import json
from state_property_routing_oracle import RoutingOracle, ROOT

class PropertyLifecycleOracle(RoutingOracle):
    def __init__(self):
        super().__init__()
        self.tobool=self.lib.lua_toboolean;self.tobool.argtypes=[C.c_void_p,C.c_int];self.tobool.restype=C.c_int

    def lifecycle(self,v):
        self.run(dict(pve=True,playerOwner=False,banned=v['banned'],ignoreBan=False,property=v['property'],delta=0,teamSize=0))
        self.events=[];L=self.state;self.top(L,0);self.phase='init';evaluations=[]
        self.getglobal(L,b'_routing_self')
        for name in ['ChangeOwnerProperty','CalcSpecialValue']:
            self.getglobal(L,b'_routing_module');self.getfield(L,-1,name.encode());self.setfield(L,-3,name.encode());self.top(L,-2)
        self.number(L,9);self.setfield(L,-2,b'castRoleUid')
        for name in ['properties','special_properties']:self.table(L,0,0);self.setfield(L,-2,name.encode())
        self.table(L,0,1);self.boolean(L,v['skipInit']);self.setfield(L,-2,b'skipInitProperty');self.setfield(L,-2,b'createArgs')
        self.table(L,0,1);self.table(L,0,1);self.pushstring(L,('ChangedLayer * coefficient' if v['layerSensitive'] else 'flat').encode())
        self.setfield(L,-2,v['property'].encode());self.setfield(L,-2,b'ExistProperty');self.setfield(L,-2,b'configData')
        self.table(L,0,1)
        def evaluate(s):evaluations.append(self.phase);self.number(s,v['base'] if self.phase=='init' else v['delta']);return 1
        self.method('GetValueByCmd',evaluate);self.setfield(L,-2,b'cmdServer')
        self.getfield(L,-1,b'owner')
        def false(s):self.boolean(s,False);return 1
        self.method('is',false);self.top(L,-2)
        self.getfield(L,-1,b'battleEngine')
        def caster(s):
            self.table(s,0,2);self.method('IsRoleType',false)
            def special(state):self.number(state,v['specialBefore'] if self.phase=='init' else v['specialAfter']);return 1
            self.method('GetProperty',special);return 1
        self.method('GetObj',caster);self.top(L,0)
        def read():
            self.top(L,0);self.getglobal(L,b'_routing_self');self.getfield(L,-1,b'properties');self.getfield(L,-1,v['property'].encode())
            self.getfield(L,-1,b'value');value=self.tonumber(L,-1,None);self.top(L,-2)
            self.getfield(L,-1,b'changeByLayer');sensitive=bool(self.tobool(L,-1));self.top(L,0)
            return {'value':value,'changeByLayer':sensitive}
        self.getglobal(L,b'_routing_module');self.getfield(L,-1,b'InitProperty');self.getglobal(L,b'_routing_self');self.check(self.call(L,1,0,0,0,None))
        initial=read();init_events=list(self.events);self.events=[];self.phase='update'
        self.getglobal(L,b'_routing_module');self.getfield(L,-1,b'UpdatePropertyWhenLayerChanges');self.getglobal(L,b'_routing_self');self.number(L,v['changedLayer']);self.check(self.call(L,2,0,0,0,None))
        final=read()
        if self.errors:raise RuntimeError(self.errors)
        return {'initial':initial,'final':final,'initialMutations':init_events,'updateMutations':self.events,'evaluations':evaluations}

if __name__=='__main__':
    o=PropertyLifecycleOracle();fixtures=[]
    for prop,values,specials,changed,sensitive,skip,banned in itertools.product(['basic_damage_per','vulnerable_per'],[(1.2,.4),(0,0),(-1.2,-.4)],[(0,0),(2.2,4.4),(4.4,2.2)],[-1,0,1],[False,True],[False,True],[False,True]):
        v=dict(property=prop,base=values[0],delta=values[1],specialBefore=specials[0],specialAfter=specials[1],changedLayer=changed,layerSensitive=sensitive,skipInit=skip,banned=banned)
        fixtures.append({'input':v,'expected':o.lifecycle(v)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleStateServer','BattleConst','BattleApi']},'scope':'Connected original InitProperty/UpdatePropertyWhenLayerChanges, CalcSpecialValue and ChangeOwnerProperty. One non-card non-player owner, supplied numeric expression results, existing non-Awakener caster with special property getters; owner mutation observed. No constructor, expression evaluation, card records, player special bonus branch, property-server mutation or gameplay.','fixtures':fixtures}
    (ROOT/'tests/synthetic/original-state-property-lifecycle.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Generated',len(fixtures),'original state property lifecycle cases')
