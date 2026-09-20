"""Connect original state contribution/routing to actual original property storage."""
import json
from state_property_lifecycle_oracle import PropertyLifecycleOracle, ROOT

class MutationBridgeOracle(PropertyLifecycleOracle):
    def __init__(self):
        super().__init__();L=self.state
        def require(s):
            name=self.string(s,1,None)
            known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.Util.BattleUtilServer':b'_oracle_util'}
            if name in known:self.getglobal(s,known[name])
            elif name in [b'Battle.Ecs.BattleComponent',b'Battle.DbgEngine.Event.BattleLogicEvent']:self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('BattlePropertyServer');self.setglobal(L,b'_bridge_property')

    def run(self,case):
        super().run(case);L=self.state;self.top(L,0);self.actual=[]
        self.getglobal(L,b'_bridge_property');self.table(L,0,1);self.number(L,10);self.setfield(L,-2,case['property'].encode());self.setfield(L,-2,b'properties')
        self.table(L,0,2);self.number(L,7);self.setfield(L,-2,b'uid')
        def owner(s):self.actual.append({'kind':'owner','property':self.string(s,2,None).decode(),'old':self.tonumber(s,3,None),'new':self.tonumber(s,4,None)});return 0
        def send(s):self.actual.append({'kind':'send','property':self.string(s,3,None).decode(),'delta':self.tonumber(s,4,None),'new':self.tonumber(s,5,None)});return 0
        self.method('OnPropertyChanged',owner);self.setfield(L,-2,b'owner');self.method('SendOnPropertyChanged',send);self.top(L,0)
        self.getglobal(L,b'_routing_self');self.getfield(L,-1,b'owner');self.getglobal(L,b'_bridge_property');self.setfield(L,-2,b'property');self.top(L,0)

    def bridge(self,v):
        contributions=self.lifecycle(v);L=self.state;self.top(L,0)
        self.getglobal(L,b'_bridge_property');self.getfield(L,-1,b'properties');self.getfield(L,-1,v['property'].encode())
        return {'contributions':{'initial':contributions['initial'],'final':contributions['final']},'propertyAfter':self.tonumber(L,-1,None),'callbacks':self.actual}

if __name__=='__main__':
    o=MutationBridgeOracle()
    cases=json.loads((ROOT/'tests/synthetic/original-state-property-lifecycle.json').read_text(encoding='utf-8'))['fixtures']
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleStateServer','BattlePropertyServer','BattleConst']},'scope':'432 connected original state InitProperty/update/special handling/recipient routing -> original ChangeProperty/pre/post/storage. Initial numeric property 10; single non-card/non-player owner and non-Awakener caster. Supplied expression results, flags and special getters; owner/send callbacks observed. No complete state creation, listener dispatch or gameplay.','fixtures':[{'input':f['input'],'expected':o.bridge(f['input'])} for f in cases]}
    (ROOT/'tests/synthetic/original-state-property-mutation-bridge.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Generated',len(cases),'connected original state-to-property cases')
