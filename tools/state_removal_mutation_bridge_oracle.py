"""Original LifeEnd -> RemoveProperty -> routing -> property storage, twice."""
import json
from state_property_mutation_bridge_oracle import MutationBridgeOracle, ROOT

class RemovalMutationOracle(MutationBridgeOracle):
    def remove(self,v):
        before=self.bridge(v);self.actual=[];L=self.state;self.top(L,0);events=[]
        self.getglobal(L,b'_routing_self')
        self.getglobal(L,b'_routing_module');self.getfield(L,-1,b'RemoveProperty');self.setfield(L,-3,b'RemoveProperty');self.top(L,-2)
        self.number(L,88);self.setfield(L,-2,b'uid');self.boolean(L,False);self.setfield(L,-2,b'isDeleted')
        self.getfield(L,-1,b'owner');self.number(L,7);self.setfield(L,-2,b'uid')
        def name(s):self.pushstring(s,b'owner');return 1
        self.method('GetBattleLogName',name);self.top(L,-2);self.getfield(L,-1,b'battleEngine')
        self.table(L,0,1)
        def unique(s):self.boolean(s,False);return 1
        self.method('IsTeamUniqueState',unique);self.setfield(L,-2,b'stateMgr')
        self.table(L,0,1)
        def deleted(s):events.append('recordDeletion');return 0
        self.method('OnDelState',deleted);self.setfield(L,-2,b'recordMgr')
        def log(s):events.append('log');return 0
        def event(s):events.append('StateLifeEnd');return 0
        self.method('LogBattleWithTab',log);self.method('CreateEventEffect',event);self.top(L,0)
        for _ in range(2):
            self.getglobal(L,b'_routing_module');self.getfield(L,-1,b'LifeEnd');self.getglobal(L,b'_routing_self');self.check(self.call(L,1,0,0,0,None));self.top(L,0)
        self.getglobal(L,b'_bridge_property');self.getfield(L,-1,b'properties');self.getfield(L,-1,v['property'].encode());after=self.tonumber(L,-1,None);self.top(L,0)
        self.getglobal(L,b'_routing_self');self.getfield(L,-1,b'isDeleted');is_deleted=bool(self.tobool(L,-1));self.top(L,0)
        if self.errors:raise RuntimeError(self.errors)
        return {'before':before,'after':after,'deleted':is_deleted,'callbacks':self.actual,'events':events}

if __name__=='__main__':
    o=RemovalMutationOracle();cases=json.loads((ROOT/'tests/synthetic/original-state-property-lifecycle.json').read_text(encoding='utf-8'))['fixtures']
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleStateServer','BattlePropertyServer']},'scope':'432 original lifecycle/property setup cases followed by original LifeEnd twice -> RemoveProperty -> ChangeOwnerProperty -> property server storage. Same supplied setup as mutation bridge, nonunique non-card/non-player owner, callbacks and record/log/event observers; event identity stub. No actual listener dispatch, manager cleanup or gameplay.','fixtures':[{'input':f['input'],'expected':o.remove(f['input'])} for f in cases]}
    (ROOT/'tests/synthetic/original-state-removal-mutation-bridge.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Generated',len(cases),'connected original removal-to-property cases')
