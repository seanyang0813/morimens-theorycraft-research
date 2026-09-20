"""Original BEAddState -> AddState through limit checks to CreateState observer."""
import ctypes as C
import json
from target_runtime_oracle import TargetOracle, ROOT

class AddStateOracle(TargetOracle):
    def __init__(self):
        super().__init__();L=self.state
        self.rawset=self.lib.lua_rawseti;self.rawset.argtypes=[C.c_void_p,C.c_int,C.c_longlong];self.rawset.restype=None
        self.boolean_read=self.lib.lua_toboolean;self.boolean_read.argtypes=[C.c_void_p,C.c_int];self.boolean_read.restype=C.c_int
        def newclass(s):
            self.table(s,0,20);self.table(s,0,1);self.method('DoEffect',lambda state:0);return 2
        self.getglobal(L,b'_oracle_config_system');self.method('NewClass',newclass);self.top(L,0)
        def require(s):
            name=self.string(s,1,None);known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.Util.BattleUtilServer':b'_oracle_util',b'Battle.DbgEngine.Effect.BEAddStateParent':b'_add_parent'}
            if name in known:self.getglobal(s,known[name])
            elif name in [b'Battle.DbgEngine.Effect.BattleEffectServer',b'Battle.DbgEngine.Card.BattleCardServer']:self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('BEAddStateParent');self.setglobal(L,b'_add_parent');self.module('BEAddState');self.setglobal(L,b'_add_effect')
        if self.errors:raise RuntimeError(self.errors)
    def run(self,v):
        L=self.state;self.top(L,0);events=[];created=[]
        self.table(L,0,5);self.number(L,7);self.setfield(L,-2,b'uid')
        def not_card(s):self.boolean(s,False);return 1
        self.method('is',not_card)
        for name,key in [('CalcStateLayerLimit','perLimit'),('CalcStateLayerLimitTotal','totalLimit')]:
            if v[key] is not None:
                def limit(s,name=name,key=key):events.append({'stage':name,'input':self.tonumber(s,3,None)});self.number(s,v[key]);return 1
                self.method(name,limit)
        self.setglobal(L,b'_add_target');self.table(L,0,8)
        self.table(L,1,0);self.getglobal(L,b'_add_target');self.rawset(L,-2,1);self.setfield(L,-2,b'targets')
        self.table(L,2,0);self.number(L,2669);self.rawset(L,-2,1)
        if v['layer'] is not None:self.number(L,v['layer']);self.rawset(L,-2,2)
        self.setfield(L,-2,b'params');self.table(L,0,0);self.setfield(L,-2,b'effectConfig')
        self.getglobal(L,b'_add_parent');self.getfield(L,-1,b'AddState');self.setfield(L,-3,b'AddState');self.top(L,-2)
        def immune(s):events.append({'stage':'immunity'});self.boolean(s,v['immune']);return 1
        def calc(s):events.append({'stage':'calculate','input':self.tonumber(s,2,None)});self.number(s,v['calculated']);return 1
        def tips(s):events.append({'stage':'tip'});return 0
        self.method('CheckImmue',immune);self.method('__CalcStateLayer',calc);self.method('__ShowTips',tips)
        self.table(L,0,3);self.number(L,9);self.setfield(L,-2,b'castRoleUid');self.number(L,11);self.setfield(L,-2,b'uid')
        def level(s):self.number(s,6);return 1
        self.method('GetSkillLevel',level);self.setfield(L,-2,b'cmdServer')
        self.table(L,0,3);self.method('LogBattleWithTab',lambda s:0)
        self.table(L,0,1);self.table(L,0,1);self.table(L,0,0);self.rawset(L,-2,2669);self.setfield(L,-2,b'State');self.setfield(L,-2,b'battleDT')
        self.table(L,0,1)
        def create(s):
            self.getfield(s,3,b'layer');created.append(self.tonumber(s,-1,None));self.top(s,-2);events.append({'stage':'create'});return 0
        self.method('CreateState',create);self.setfield(L,-2,b'stateMgr');self.setfield(L,-2,b'battleEngine');self.setglobal(L,b'_add_subject')
        self.getglobal(L,b'_add_effect');self.getfield(L,-1,b'DoEffect');self.getglobal(L,b'_add_subject');self.check(self.call(L,1,1,0,0,None))
        if self.errors:raise RuntimeError(self.errors)
        return {'createdLayers':created,'events':events,'returned':bool(self.boolean_read(L,-1))}

if __name__=='__main__':
    o=AddStateOracle();fixtures=[]
    for layer in [None,-.1,0,.5,2.2]:
        for calculated in [-2,0,5]:
            for immune in [False,True]:
                for per,total in [(None,None),(2,None),(2,4),(0,4),(2,0)]:
                    v={'layer':layer,'calculated':calculated,'immune':immune,'perLimit':per,'totalLimit':total};fixtures.append({'input':v,'expected':o.run(v)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BEAddState','BEAddStateParent']},'scope':'150 original DoEffect -> AddState method-chain cases, one supplied non-card target. No-op superclass, supplied immunity/layer calculation/limit results and CreateState observer. Does not create states, apply modifiers/properties, events or gameplay.','fixtures':fixtures}
    (ROOT/'tests/synthetic/original-add-state-requests.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(fixtures),'original state-add request cases')
