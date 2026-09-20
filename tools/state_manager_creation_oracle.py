"""Original manager creation/lookup/merge routing with explicit constructor adapter."""
import ctypes as C
import itertools
import json
from state_property_routing_oracle import RoutingOracle, ROOT

class StateManagerOracle(RoutingOracle):
    def __init__(self):
        super().__init__();L=self.state;self.trace=[]
        self.rawlen=self.lib.lua_rawlen;self.rawlen.argtypes=[C.c_void_p,C.c_int];self.rawlen.restype=C.c_size_t
        self.rawget=self.lib.lua_rawgeti;self.rawget.argtypes=[C.c_void_p,C.c_int,C.c_longlong];self.rawget.restype=C.c_int
        self.kind=self.lib.lua_type;self.kind.argtypes=[C.c_void_p,C.c_int];self.kind.restype=C.c_int
        self.enums={}
        for group,names in [('RoleType',['Awaker','Player','Monster']),('StateDeathHandling',['Wipe','NonWipe_ProhibitTrigger','NonWipe_AllowTrigger']),('StateType',['Awaker','Role','Card'])]:
            self.getglobal(L,b'_oracle_bc');self.getfield(L,-1,group.encode())
            for name in names:
                self.getfield(L,-1,name.encode());self.enums[group+'.'+name]=self.string(L,-1,None).decode() if self.kind(L,-1)==4 else self.tonumber(L,-1,None);self.top(L,-2)
            self.top(L,0)
        def construct(s):self.trace.append('construct');self.getglobal(s,b'_manager_new');return 1
        self.callback(construct);self.setglobal(L,b'_manager_constructor')
        self.table(L,0,1)
        def stats(s):self.trace.append('stats');return 0
        self.method('RecordActionStats_AddState',stats);self.setglobal(L,b'_manager_stats')
        self.table(L,0,1);self.pushstring(L,b'StateOnAdd');self.setfield(L,-2,b'StateOnAdd');self.setglobal(L,b'_manager_event')
        def require(s):
            name=self.string(s,1,None)
            known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.DbgEngine.State.BattleStateServer':b'_manager_constructor',b'Battle.DbgEngine.Stats.BattleActionStatsUtil':b'_manager_stats',b'Battle.DbgEngine.Event.BattleLogicEvent':b'_manager_event'}
            if name in known:self.getglobal(s,known[name])
            elif name in [b'Battle.DbgEngine.Card.BattleCardServer',b'Battle.Ecs.BattleEngineComponent']:self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('BattleStateMgrServer');self.setglobal(L,b'_manager_class')

    def run_creation(self,v):
        L=self.state;self.top(L,0);self.trace=[]
        self.table(L,0,5);self.number(L,88);self.setfield(L,-2,b'uid');self.number(L,2669);self.setfield(L,-2,b'stateId')
        def after(s):self.trace.append('afterInit');return 0
        def serialize(s):self.trace.append('serialize');self.table(s,0,0);return 1
        self.method('AfterInit',after);self.method('Serialize',serialize);self.setglobal(L,b'_manager_new')
        self.table(L,0,4);self.number(L,7);self.setfield(L,-2,b'uid');self.number(L,1);self.setfield(L,-2,b'camp')
        def role(s):
            wanted=self.enums.get('RoleType.'+v['role']);match=wanted is not None and any(self.tonumber(s,i,None)==wanted for i in [2,3])
            self.boolean(s,match);return 1
        def dead(s):self.boolean(s,v['dead']);return 1
        def card(s):self.boolean(s,v['role']=='Card');return 1
        self.method('IsRoleType',role);self.method('IsDead',dead);self.method('is',card);self.setglobal(L,b'_manager_target')
        self.getglobal(L,b'_manager_class');self.table(L,0,1)
        if v['existing']!='absent':
            self.table(L,1,0);self.table(L,0,4);self.number(L,77);self.setfield(L,-2,b'uid');self.number(L,2669);self.setfield(L,-2,b'stateId');self.boolean(L,v['existing']=='deleted');self.setfield(L,-2,b'isDeleted')
            def merge(s):self.trace.append('merge');return 0
            self.method('AddLayer',merge);self.rawseti(L,-2,1);self.rawseti(L,-2,7)
        self.setfield(L,-2,b'ownerUid2StateList')
        def unique(s):self.boolean(s,v['unique']);return 1
        self.method('IsTeamUniqueState',unique)
        self.table(L,0,7)
        for method,label in [('LogBattleWithTab','deadRejected'),('Error','invalidTarget'),('Info','emptyRejected'),('DebugS','debug'),('CreateEventEffect','onAdd')]:
            def observe(s,label=label):self.trace.append(label);return 0
            self.method(method,observe)
        self.table(L,0,1);self.table(L,0,1);self.table(L,0,1)
        handling=self.enums['StateDeathHandling.'+v['deathHandling']];self.pushstring(L,handling.encode());self.setfield(L,-2,b'DeathHandling');self.rawseti(L,-2,2669);self.setfield(L,-2,b'State');self.setfield(L,-2,b'battleDT')
        self.table(L,0,2)
        for name,label in [('OnAddState','recordRole'),('OnAddCardState','recordCard')]:
            def record(s,label=label):self.trace.append(label);return 0
            self.method(name,record)
        self.setfield(L,-2,b'recordMgr');self.table(L,0,1)
        def change(s):self.trace.append('unique');return 0
        self.method('ChangeUniqueStateRole',change);self.setfield(L,-2,b'roleMgr');self.setfield(L,-2,b'battleEngine');self.top(L,0)
        self.table(L,0,3);self.number(L,2669);self.setfield(L,-2,b'stateId');self.boolean(L,v['skipOnAdd']);self.setfield(L,-2,b'skipOnAdd')
        if v['layer'] is not None:self.number(L,v['layer']);self.setfield(L,-2,b'layer')
        self.setglobal(L,b'_manager_args')
        self.getglobal(L,b'_manager_class');self.getfield(L,-1,b'CreateState');self.getglobal(L,b'_manager_class');self.getglobal(L,b'_manager_target');self.getglobal(L,b'_manager_args');self.check(self.call(L,3,1,0,0,None))
        returned=None
        if self.kind(L,-1)!=0:self.getfield(L,-1,b'uid');returned=self.tonumber(L,-1,None)
        self.top(L,0);self.getglobal(L,b'_manager_class');self.getfield(L,-1,b'ownerUid2StateList');self.rawget(L,-1,7)
        count=0 if self.kind(L,-1)==0 else self.rawlen(L,-1)
        if self.errors:raise RuntimeError(self.errors)
        return {'returnedUid':returned,'registryCount':count,'trace':self.trace}

if __name__=='__main__':
    o=StateManagerOracle();fixtures=[]
    for role,dead,handling,layer,existing,skip,unique in itertools.product(['Awaker','Monster','Card','Invalid'],[False,True],['Wipe','NonWipe_ProhibitTrigger','NonWipe_AllowTrigger'],[None,0,2],['absent','live','deleted'],[False,True],[False,True]):
        v=dict(role=role,dead=dead,deathHandling=handling,layer=layer,existing=existing,skipOnAdd=skip,unique=unique);fixtures.append({'input':v,'expected':o.run_creation(v)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleStateMgrServer','BattleConst']},'scope':'Original CreateState -> __CreateState -> GetState; actual registry list append/lookup. Constructor and existing AddLayer are adapters; AfterInit/Serialize/records/unique-role/event/stat calls observed; supplied role/death/unique flags. Event identity stubbed. No real state constructor, property initialization, merge arithmetic, event execution or gameplay.','fixtures':fixtures}
    (ROOT/'tests/synthetic/original-state-manager-creation.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Generated',len(fixtures),'original state manager creation cases')
