"""Original target-expression GetStateLayer connected to manager GetState."""
import itertools
import json
from state_manager_creation_oracle import StateManagerOracle, ROOT

class LookupOracle(StateManagerOracle):
    def __init__(self):
        super().__init__();L=self.state
        def require(s):
            name=self.string(s,1,None)
            known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.Util.BattleUtilServer':b'_oracle_util'}
            if name in known:self.getglobal(s,known[name])
            elif name==b'Battle.DbgEngine.Cmd.Expression.BattleCmdBaseExpression':self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('BattleCmdTargetsExp');self.setglobal(L,b'_lookup_expression')

    def lookup(self,v):
        L=self.state;self.top(L,0)
        self.getglobal(L,b'_manager_class');self.table(L,0,1);self.table(L,len(v['states']),0)
        for i,state in enumerate(v['states'],1):
            self.table(L,0,3);self.number(L,state['stateId']);self.setfield(L,-2,b'stateId');self.boolean(L,state['deleted']);self.setfield(L,-2,b'isDeleted')
            self.table(L,0,1);self.number(L,state['layer']);self.setfield(L,-2,b'layer');self.setfield(L,-2,b'data');self.rawseti(L,-2,i)
        self.rawseti(L,-2,7);self.setfield(L,-2,b'ownerUid2StateList');self.top(L,0)
        self.table(L,0,1);self.table(L,1,0)
        if v['hasTarget']:
            self.table(L,0,2);self.number(L,7);self.setfield(L,-2,b'uid');self.table(L,0,1);self.getglobal(L,b'_manager_class');self.setfield(L,-2,b'stateMgr');self.setfield(L,-2,b'battleEngine');self.rawseti(L,-2,1)
        self.setfield(L,-2,b'targets');self.setglobal(L,b'_lookup_subject')
        self.getglobal(L,b'_lookup_expression');self.getfield(L,-1,b'GetStateLayer');self.getglobal(L,b'_lookup_subject');self.number(L,v['query']);self.check(self.call(L,2,1,0,0,None))
        if self.errors:raise RuntimeError(self.errors)
        return self.tonumber(L,-1,None)

if __name__=='__main__':
    o=LookupOracle();fixtures=[]
    patterns=[[],[{'stateId':1,'layer':3,'deleted':False}],[{'stateId':1,'layer':8,'deleted':True},{'stateId':1,'layer':2.5,'deleted':False}],[{'stateId':1,'layer':3,'deleted':False},{'stateId':1,'layer':7,'deleted':False}],[{'stateId':1,'layer':0,'deleted':False}],[{'stateId':2,'layer':4,'deleted':False}]]
    for target,states,query in itertools.product([False,True],patterns,[1,2]):
        v=dict(hasTarget=target,states=states,query=query);fixtures.append({'input':v,'expected':o.lookup(v)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleCmdTargetsExp','BattleStateMgrServer']},'scope':'24 connected original target-expression GetStateLayer -> manager GetState cases. Supplied first target and real Lua registry tables; missing/deleted/duplicate/mismatched states. No original parser target binding, state lifecycle or gameplay.','fixtures':fixtures}
    (ROOT/'tests/synthetic/original-live-state-lookup.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Generated',len(fixtures),'original live state lookup cases')
