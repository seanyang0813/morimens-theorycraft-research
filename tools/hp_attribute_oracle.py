"""Original BEChangeAttr HP-loss branch plus property mutation, with event spies."""
import ctypes as C
import json
from hp_property_oracle import HpPropertyOracle, ROOT

class HpAttributeOracle(HpPropertyOracle):
    def __init__(self):
        super().__init__();L=self.state
        self.pushstring=self.lib.lua_pushstring;self.pushstring.argtypes=[C.c_void_p,C.c_char_p]
        self.rawseti=self.lib.lua_rawseti;self.rawseti.argtypes=[C.c_void_p,C.c_int,C.c_longlong]
        def noop(s):return 0
        self.table(L,0,1);self.method('DoEffect',noop);self.setglobal(L,b'_attr_super')
        self.getglobal(L,b'_oracle_config_system')
        def newclass(s):self.table(s,0,10);self.getglobal(s,b'_attr_super');return 2
        self.method('NewClass',newclass);self.top(L,0)
        known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.DbgEngine.Event.BattleLogicEvent':b'_attr_events',b'Battle.DbgEngine.Effect.BattleEffectServer':b'_attr_super'}
        def require(s):
            name=self.string(s,1,None)
            if name in known:self.getglobal(s,known[name])
            elif name==b'Battle.DbgEngine.Card.BattleCardServer':self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('BattleLogicEvent');self.setglobal(L,b'_attr_events')
        self.names={}
        for key in ['HpDown','BEChangeAttrHp']:
            self.getglobal(L,b'_attr_events');self.getfield(L,-1,key.encode());self.names[self.tonumber(L,-1,None)]=key;self.top(L,0)
        self.module('BEChangeAttr');self.setglobal(L,b'_attr_effect')
        self.table(L,0,7);self.number(L,7);self.setfield(L,-2,b'uid');self.getglobal(L,b'_hp_property');self.setfield(L,-2,b'property')
        def prop(s):
            key=self.string(s,2,None);self.getglobal(s,b'_hp_property');self.getfield(s,-1,b'properties');self.getfield(s,-1,key);return 1
        def hpzero(s):
            self.getglobal(s,b'_hp_property');self.getfield(s,-1,b'properties');self.getfield(s,-1,b'hp');self.boolean(s,self.tonumber(s,-1,None)<=0);return 1
        def false(s):self.boolean(s,False);return 1
        def death(s):self.deathChecks+=1;return 0
        self.method('GetProperty',prop);self.method('HpIs0',hpzero);self.method('is',false);self.method('CheckDeathEvent',death);self.setglobal(L,b'_attr_target')
        self.table(L,0,2)
        def event(s):
            row={'name':self.names[self.tonumber(s,2,None)]}
            for key in ['castValue','deltaValue','overflowValue']:
                self.getfield(s,3,key.encode());row[key]=self.tonumber(s,-1,None);self.top(s,-2)
            self.eventTrace.append(row);return 0
        self.method('CreateEventEffect',event);self.table(L,0,1)
        def player(s):self.getglobal(s,b'_attr_target');return 1
        self.method('GetPlayer',player);self.setfield(L,-2,b'roleMgr');self.setglobal(L,b'_attr_engine')
        self.getglobal(L,b'_attr_effect');self.getglobal(L,b'_attr_engine');self.setfield(L,-2,b'battleEngine')
        self.pushstring(L,b'hp');self.setfield(L,-2,b'fixArg')
        self.table(L,1,0);self.getglobal(L,b'_attr_target');self.rawseti(L,-2,1);self.setfield(L,-2,b'targets')
        self.table(L,0,2)
        for key,value in [('castRoleUid',9),('uid',11)]:self.number(L,value);self.setfield(L,-2,key.encode())
        self.setfield(L,-2,b'cmdServer')
        def source(s):self.table(s,0,0);return 1
        self.method('GetPropertyChangeSource',source);self.top(L,0)
        if self.errors:raise RuntimeError(self.errors)

    def evaluate(self,v):
        L=self.state;self.top(L,0);self.events=[];self.eventTrace=[];self.deathChecks=0
        self.getglobal(L,b'_hp_property');self.table(L,0,4)
        for key,value in {'hp':v['hp'],'max_hp':v['hp'],'immue_change_hp':v['immunity'],'be_change_hp_limit':v['limit']}.items():self.number(L,value);self.setfield(L,-2,key.encode())
        self.setfield(L,-2,b'properties');self.top(L,0)
        self.getglobal(L,b'_attr_effect');self.table(L,1,0);self.number(L,v['rawValue']);self.rawseti(L,-2,1);self.setfield(L,-2,b'params')
        self.getfield(L,-1,b'DoEffect');self.getglobal(L,b'_attr_effect');self.check(self.call(L,1,1,0,0,None));self.top(L,0)
        self.getglobal(L,b'_hp_property');self.getfield(L,-1,b'properties');self.getfield(L,-1,b'hp')
        return dict(hpAfter=self.tonumber(L,-1,None),propertyCallbacks=self.events,events=self.eventTrace,deathChecks=self.deathChecks)

if __name__=='__main__':
    o=HpAttributeOracle();base=dict(hp=10,rawValue=-9,immunity=0,limit=0)
    changes=[{},dict(rawValue=-30),dict(rawValue=-4.5),dict(rawValue=-.5),dict(rawValue=0),dict(immunity=1),dict(limit=2.5),dict(hp=0),dict(hp=.5),dict(immunity=1,limit=2)]
    out={'scope':'Original BEChangeAttr.DoEffect/GetFixValueByPropertyType HP-loss branch with original ChangeProperty/SubProperty. Base DoEffect and source-metadata creation stubbed; role type is non-card, callbacks/event enqueue/death checks observed only. No command selection, state layers, listener execution or gameplay validation.','sourceHashes':{name:o.assets[name+'.lua']['sha256'] for name in ['BEChangeAttr','BattlePropertyServer']},'fixtures':[{'input':{**base,**change},'expected':o.evaluate({**base,**change})} for change in changes]}
    (ROOT/'tests/synthetic/original-hp-attribute.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Generated',len(changes),'original HP-attribute cases')
