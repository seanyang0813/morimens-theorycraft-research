"""Original RemoveProperty connected to original recipient routing; non-card owner."""
import itertools
import json
from state_property_routing_oracle import RoutingOracle, ROOT
class RemovalOracle(RoutingOracle):
    def remove(self,case):
        self.run({**case,'delta':0});self.events=[];L=self.state;self.top(L,0)
        self.getglobal(L,b'_routing_self')
        self.getglobal(L,b'_routing_module');self.getfield(L,-1,b'ChangeOwnerProperty');self.setfield(L,-3,b'ChangeOwnerProperty');self.top(L,-2)
        self.table(L,0,1);self.table(L,0,1);self.number(L,case['storedValue']);self.setfield(L,-2,b'value');self.setfield(L,-2,case['property'].encode());self.setfield(L,-2,b'properties')
        self.getfield(L,-1,b'owner')
        def iscard(s):self.boolean(s,False);return 1
        self.method('is',iscard);self.top(L,0)
        self.getglobal(L,b'_routing_module');self.getfield(L,-1,b'RemoveProperty');self.getglobal(L,b'_routing_self');self.boolean(L,case['ignoreBan']);self.check(self.call(L,2,0,0,0,None))
        self.top(L,0);self.getglobal(L,b'_routing_self');self.getfield(L,-1,b'properties');self.getfield(L,-1,case['property'].encode());self.getfield(L,-1,b'value');retained=self.tonumber(L,-1,None)
        if self.errors:raise RuntimeError(self.errors)
        return {'mutations':self.events,'storedValueAfter':retained}
if __name__=='__main__':
    o=RemovalOracle();fixtures=[]
    for pve,player,banned,ignore,prop,value in itertools.product([False,True],[False,True],[False,True],[False,True],['strikecard_damage_plus','basic_damage_per'],[-20,0,30]):
        v=dict(pve=pve,playerOwner=player,banned=banned,ignoreBan=ignore,property=prop,storedValue=value,teamSize=2)
        fixtures.append({'input':v,'expected':o.remove(v)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original RemoveProperty calls original ChangeOwnerProperty with one recorded contribution and a non-card owner. Supplied owner/team/ban/PVE flags; recipient ChangeProperty observed only. No property mutation, card-cost records, multi-property order or gameplay.',
        'sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleStateServer','BattleConst']},'fixtures':fixtures}
    (ROOT/'tests/synthetic/original-state-property-removal.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Generated',len(fixtures),'original property removal/routing cases')
