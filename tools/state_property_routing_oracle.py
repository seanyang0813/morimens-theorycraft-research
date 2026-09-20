"""Execute original property routing; synthetic owners, intercepted mutations.

This checks recipient selection, not state construction or gameplay restoration.
"""
import ctypes as C
import itertools
import json
from target_runtime_oracle import TargetOracle, ROOT

class RoutingOracle(TargetOracle):
    def __init__(self):
        super().__init__()
        self.events=[]
        self.case={}
        self.rawseti=self.lib.lua_rawseti
        self.rawseti.argtypes=[C.c_void_p,C.c_int,C.c_longlong]
        self.rawseti.restype=None
        def require(s):
            name=self.string(s,1,None)
            known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.DbgEngine.Cmd.BattleCmdServer':b'_oracle_cmd'}
            empty=[b'Battle.Ecs.BattleEntity',b'Battle.DbgEngine.Card.BattleCardServer',b'Battle.DbgEngine.Cmd.BattleCmdParser',b'Battle.DbgEngine.Event.BattleLogicEvent',b'Battle.DbgEngine.DataCenter.BattleStateData']
            if name in known:self.getglobal(s,known[name])
            elif name in empty:self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(self.state,b'require')
        self.module('BattleStateServer');self.setglobal(self.state,b'_routing_module')
        if self.errors:raise RuntimeError(self.errors)
        self.api=json.loads((ROOT/'research/extracted/config/BattleApi.json').read_text(encoding='utf-8'))
        self.pushstring=self.lib.lua_pushstring
        self.pushstring.argtypes=[C.c_void_p,C.c_char_p];self.pushstring.restype=C.c_void_p

    def run(self,case):
        self.case=case;self.events=[];L=self.state;self.top(L,0)
        def flag(key):
            def get(s):self.boolean(s,case[key]);return 1
            return get
        def mutation(recipient):
            def record(s):
                self.events.append({'recipient':recipient,'property':self.string(s,2,None).decode(),'delta':self.tonumber(s,3,None)})
                return 0
            return record
        self.table(L,0,3)
        self.method('IsBan',flag('banned'))
        self.table(L,0,2)
        self.method('IsPVE',flag('pve'))
        self.table(L,0,1);self.table(L,0,1);self.table(L,0,1)
        self.pushstring(L,self.api[case['property']]['ApiType'].encode());self.setfield(L,-2,b'ApiType')
        self.setfield(L,-2,case['property'].encode());self.setfield(L,-2,b'BattleApi');self.setfield(L,-2,b'battleDT')
        self.setfield(L,-2,b'battleEngine')
        self.table(L,0,3)
        self.method('IsRoleType',flag('playerOwner'))
        def team(s):
            self.table(s,case['teamSize'],0)
            for i in range(case['teamSize']):
                self.table(s,0,1);self.method('ChangeProperty',mutation('awaker-'+str(i)));self.rawseti(s,-2,i+1)
            return 1
        self.method('GetAwakerList',team)
        self.table(L,0,1);self.method('ChangeProperty',mutation('owner'));self.setfield(L,-2,b'property')
        self.setfield(L,-2,b'owner');self.setglobal(L,b'_routing_self')
        self.getglobal(L,b'_routing_module');self.getfield(L,-1,b'ChangeOwnerProperty')
        self.getglobal(L,b'_routing_self');self.pushstring(L,case['property'].encode());self.number(L,case['delta'])
        self.table(L,0,1);self.boolean(L,case['ignoreBan']);self.setfield(L,-2,b'ignoreBan')
        self.check(self.call(L,4,0,0,0,None))
        return self.events

if __name__=='__main__':
    oracle=RoutingOracle();results=[]
    for pve,player,prop,banned,ignore,delta,size in itertools.product([False,True],[False,True],['strikecard_damage_plus','i_damage_per_strikecard','basic_damage_per'],[False,True],[False,True],[-653,0,653],[0,4]):
        case=dict(pve=pve,playerOwner=player,property=prop,banned=banned,ignoreBan=ignore,delta=delta,teamSize=size)
        actual=oracle.run(case)
        recipients=[] if banned and not ignore else (['awaker-'+str(i) for i in range(size)] if pve and player and prop!='basic_damage_per' else ['owner'])
        expected=[dict(recipient=r,property=prop,delta=delta) for r in recipients]
        assert actual==expected,(case,actual,expected)
        results.append(dict(inputs=case,mutations=actual))
    assets={a['name']:a for a in json.loads((ROOT/'research/symbols/text-assets.json').read_text())}
    out=ROOT/'research/evidence/state-property-routing-runtime.json'
    out.write_text(json.dumps({'build':'pc-res144-build51','scope':'original ChangeOwnerProperty only, mocked flags/team and intercepted ChangeProperty; not restoration, rounding, state lifetime or gameplay','sourceHashes':{k:assets[k+'.lua']['sha256'] for k in ['BattleStateServer','BattleApi','BattleConst']},'cases':results},indent=2),encoding='utf-8')
    print(f'{len(results)} original routing checks passed; {out}')
