"""Original LifeEnd ordering with property/removal/event observers."""
import json
from state_callback_oracle import StateCallbackOracle, ROOT
class LifeEndOracle(StateCallbackOracle):
    def __init__(self):
        super().__init__();L=self.state;self.module('BattleLogicEvent');self.setglobal(L,b'_life_events')
        def require(s):
            name=self.string(s,1,None)
            known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.DbgEngine.Cmd.BattleCmdServer':b'_oracle_cmd',b'Battle.DbgEngine.Event.BattleLogicEvent':b'_life_events'}
            if name in known:self.getglobal(s,known[name])
            elif name in [b'Battle.Ecs.BattleEntity',b'Battle.DbgEngine.Card.BattleCardServer',b'Battle.DbgEngine.Cmd.BattleCmdParser',b'Battle.DbgEngine.DataCenter.BattleStateData']:self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('BattleStateServer');self.setglobal(L,b'_life_state_class')
    def run(self,v):
        L=self.state;self.top(L,0);self.trace=[]
        def observer(name):
            def call(s):
                self.getglobal(s,b'_life_self');self.getfield(s,-1,b'isDeleted');deleted=bool(self.tobool(s,-1));self.top(s,-3)
                self.trace.append({'event':name,'deleted':deleted});return 0
            return call
        self.table(L,0,7);self.boolean(L,v['deleted']);self.setfield(L,-2,b'isDeleted')
        for key,value in [('uid',88),('stateId',80575),('stateType',1)]:self.integer(L,value);self.setfield(L,-2,key.encode())
        self.method('RemoveProperty',observer('RemoveProperty'))
        self.table(L,0,3);self.integer(L,7);self.setfield(L,-2,b'uid');self.integer(L,2);self.setfield(L,-2,b'camp')
        def name(s):self.pushstring(s,b'target');return 1
        self.method('GetBattleLogName',name);self.setfield(L,-2,b'owner')
        self.table(L,0,1);self.pushstring(L,b'state');self.setfield(L,-2,b'CnID');self.setfield(L,-2,b'configData')
        self.table(L,0,5);self.method('LogBattleWithTab',observer('Log'));self.method('CreateEventEffect',observer('StateLifeEnd'))
        self.table(L,0,1)
        def unique(s):self.boolean(s,v['unique']);return 1
        self.method('IsTeamUniqueState',unique);self.setfield(L,-2,b'stateMgr')
        self.table(L,0,1);self.method('RemoveUniqueStateRole',observer('RemoveUniqueStateRole'));self.setfield(L,-2,b'roleMgr')
        self.table(L,0,1);self.method('OnDelState',observer('OnDelState'));self.setfield(L,-2,b'recordMgr')
        self.setfield(L,-2,b'battleEngine');self.setglobal(L,b'_life_self')
        for _ in range(v['calls']):
            self.top(L,0);self.getglobal(L,b'_life_state_class');self.getfield(L,-1,b'LifeEnd');self.getglobal(L,b'_life_self');self.check(self.call(L,1,0,0,0,None))
        if self.errors:raise RuntimeError(self.errors)
        return {'deleted':True,'trace':self.trace}
if __name__=='__main__':
    o=LifeEndOracle();cases=[{'deleted':deleted,'unique':unique,'calls':calls} for deleted in [False,True] for unique in [False,True] for calls in [1,2]]
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original LifeEnd with supplied team-unique decision; property removal, unique registry removal, record, logging and event creation observed only. Checks deletion visible during callbacks and repeat-call idempotence. No actual property mutation, event dispatch or gameplay.',
        'sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleStateServer','BattleLogicEvent']},'fixtures':[{'input':v,'expected':o.run(v)} for v in cases]}
    (ROOT/'tests/synthetic/original-state-life-end.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Generated',len(cases),'original LifeEnd cases')
