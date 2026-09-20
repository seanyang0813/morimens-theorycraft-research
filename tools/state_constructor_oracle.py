"""Original state ctor + StateData.Create + numeric InitStateParams/AfterInit."""
import ctypes as C
import itertools
import json
from state_property_routing_oracle import RoutingOracle, ROOT

class ConstructorOracle(RoutingOracle):
    def __init__(self):
        super().__init__();L=self.state
        self.rawget=self.lib.lua_rawgeti;self.rawget.argtypes=[C.c_void_p,C.c_int,C.c_longlong];self.rawget.restype=C.c_int
        self.module('BattleStateData');self.setglobal(L,b'_ctor_data')
        def newclass(s):self.table(s,0,0);self.table(s,0,1);self.method('ctor',lambda t:0);return 2
        self.getglobal(L,b'_oracle_config_system');self.method('NewClass',newclass);self.top(L,0)
        self.getglobal(L,b'table')
        def clone(s):self.pushvalue(s,1);return 1
        self.method('deepclone',clone);self.top(L,0)
        def require(s):
            name=self.string(s,1,None)
            known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.DbgEngine.DataCenter.BattleStateData':b'_ctor_data'}
            if name in known:self.getglobal(s,known[name])
            elif name in [b'Battle.Ecs.BattleEntity',b'Battle.DbgEngine.Card.BattleCardServer',b'Battle.DbgEngine.Cmd.BattleCmdServer',b'Battle.DbgEngine.Cmd.BattleCmdParser',b'Battle.DbgEngine.Event.BattleLogicEvent']:self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('BattleStateServer');self.setglobal(L,b'_ctor_class')

    def construct(self,v):
        L=self.state;self.top(L,0);trace=[]
        self.table(L,0,5)
        for method in ['InitStateParams','AfterInit']:
            self.getglobal(L,b'_ctor_class');self.getfield(L,-1,method.encode());self.setfield(L,-3,method.encode());self.top(L,-2)
        def parser(s):
            trace.append('parser');self.table(s,0,1)
            def evaluate(t):trace.append('maximum');self.number(t,v['maximum']);return 1
            self.method('GetValueByCmd',evaluate);self.setfield(s,1,b'cmdServer');return 0
        self.method('InitCmdParser',parser)
        for name,label in [('InitTrigger','triggers'),('LogBattleLayer','log'),('InitProperty','properties')]:
            def observe(s,label=label):trace.append(label);return 0
            self.method(name,observe)
        self.setglobal(L,b'_ctor_subject')
        self.table(L,0,1);self.table(L,0,2)
        def uid(s):trace.append('uid');self.number(s,88);return 1
        self.method('GenObjUid',uid);self.table(L,0,1);self.table(L,0,1);self.table(L,0,1)
        if v['maximum'] is not None:self.pushstring(L,b'max');self.setfield(L,-2,b'MaxLayer')
        self.rawseti(L,-2,2669);self.setfield(L,-2,b'State');self.setfield(L,-2,b'battleDT');self.setfield(L,-2,b'battleEngine');self.setglobal(L,b'_ctor_owner')
        self.table(L,0,7);self.number(L,2669);self.setfield(L,-2,b'stateId');self.number(L,7);self.setfield(L,-2,b'castRoleUid');self.boolean(L,v['recover']);self.setfield(L,-2,b'isRecover')
        for key,name in [('layer','layer'),('skillLevel','skillLevel'),('parameter','stateParams')]:
            if v[key] is not None:self.number(L,v[key]);self.setfield(L,-2,name.encode())
        if v['restoredData']:
            self.table(L,0,3)
            for key,n in [('layer',3),('changedLayer',9)]:self.number(L,n);self.setfield(L,-2,key.encode())
            self.table(L,0,1);self.number(L,3);self.rawseti(L,-2,7);self.setfield(L,-2,b'casterLayerList');self.setfield(L,-2,b'data')
        self.setglobal(L,b'_ctor_args')
        self.getglobal(L,b'_ctor_class');self.getfield(L,-1,b'ctor');self.getglobal(L,b'_ctor_subject');self.getglobal(L,b'_ctor_owner');self.getglobal(L,b'_ctor_args');self.check(self.call(L,3,0,0,0,None))
        self.getglobal(L,b'_ctor_class');self.getfield(L,-1,b'AfterInit');self.getglobal(L,b'_ctor_subject');self.check(self.call(L,1,0,0,0,None))
        def field(path):
            self.top(L,0);self.getglobal(L,b'_ctor_subject')
            for key in path:
                if isinstance(key,int):self.rawget(L,-1,key)
                else:self.getfield(L,-1,key.encode())
            return self.tonumber(L,-1,None)
        result={'uid':field(['uid']),'layer':field(['data','layer']),'changedLayer':field(['data','changedLayer']),'casterLayers7':field(['data','casterLayerList',7]),'skillLevel':field(['skillLevel']),'parameters':[] if v['parameter'] is None else [field(['stateParams',1])],'trace':trace}
        if self.errors:raise RuntimeError(self.errors)
        return result

if __name__=='__main__':
    o=ConstructorOracle();fixtures=[]
    for layer,maximum,recover,restored,level,param in itertools.product([None,2,8],[None,4.2],[False,True],[False,True],[None,6],[None,2.5]):
        v=dict(layer=layer,maximum=maximum,recover=recover,restoredData=restored,skillLevel=level,parameter=param);fixtures.append({'input':v,'expected':o.construct(v)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleStateServer','BattleStateData']},'scope':'96 original ctor -> original StateData.Create (unless restored data), numeric/absent InitStateParams and AfterInit. No-op entity superclass, supplied UID/max/parser; triggers/log/property initialization observed. table.deepclone identity adapter does not verify copying. No real command parser, triggers, properties, manager integration or gameplay.','fixtures':fixtures}
    (ROOT/'tests/synthetic/original-state-constructor.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Generated',len(fixtures),'original state constructor cases')
