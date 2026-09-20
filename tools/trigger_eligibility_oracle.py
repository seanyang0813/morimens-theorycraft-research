"""Original state-trigger eligibility, with explicit owner/state/camp properties."""
import itertools
import json
from behit_hp_oracle import BeHitHpOracle, ROOT
class TriggerEligibilityOracle(BeHitHpOracle):
    def __init__(self):
        super().__init__();L=self.state
        def require(s):
            name=self.string(s,1,None)
            if name==b'System.System':self.getglobal(s,b'_oracle_config_system')
            elif name==b'Battle.BattleConst':self.getglobal(s,b'_oracle_bc')
            elif name==b'Battle.DbgEngine.Card.BattleCardServer':self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require')
        self.module('BattleStateTriggerServer');self.setglobal(L,b'_eligibility_base')
        if self.errors:raise RuntimeError(self.errors)
    def eligible(self,v):
        L=self.state;self.top(L,0)
        self.getglobal(L,b'_eligibility_base');self.getfield(L,-1,b'TryTrigger')
        self.table(L,0,2);self.table(L,0,2)
        self.boolean(L,v['deleted']);self.setfield(L,-2,b'isDeleted')
        self.table(L,0,3);self.number(L,7);self.setfield(L,-2,b'uid')
        def monster(s):self.boolean(s,v['monster']);return 1
        def camp(s):self.number(s,v['ownerCamp']);return 1
        self.method('IsRoleType',monster);self.method('GetCamp',camp)
        self.setfield(L,-2,b'owner');self.setfield(L,-2,b'state')
        self.table(L,0,1);self.boolean(L,v['enemy']);self.setfield(L,-2,b'isEnemy');self.setfield(L,-2,b'cbParams')
        self.number(L,v['triggerCamp'])
        if v['roleUid'] is None:self.nil(L)
        else:self.number(L,v['roleUid'])
        self.check(self.call(L,3,1,0,0,None))
        return bool(self.tobool(L,-1))
if __name__=='__main__':
    o=TriggerEligibilityOracle();fixtures=[]
    for deleted,monster,enemy,triggerCamp,uid in itertools.product([False,True],[False,True],[False,True],[1,2],[None,0,7,9]):
        v=dict(deleted=deleted,monster=monster,enemy=enemy,ownerCamp=2,triggerCamp=triggerCamp,roleUid=uid)
        fixtures.append({'input':v,'expected':o.eligible(v)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original TryTrigger; explicit state deletion, owner monster/camp/uid adapters. No state callback or command execution. Includes roleUid zero, which is truthy in Lua.','sourceHash':o.assets['BattleStateTriggerServer.lua']['sha256'],'fixtures':fixtures}
    (ROOT/'tests/synthetic/original-trigger-eligibility.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(fixtures),'original trigger eligibility cases')
