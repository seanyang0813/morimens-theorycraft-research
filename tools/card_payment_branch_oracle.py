"""Original __CostEnergy branch selection; payment and resource mutation are spies."""
import json
from card_cost_oracle import CardCostOracle, ROOT

class PaymentBranchOracle(CardCostOracle):
    def __init__(self,asset_overrides=None):
        asset_overrides=asset_overrides or {}
        super().__init__(asset_overrides);L=self.state
        def require(s):
            name=self.string(s,1,None)
            if name==b'System.System':self.getglobal(s,b'_oracle_config_system')
            elif name==b'Battle.BattleConst':self.getglobal(s,b'_oracle_bc')
            elif name in [b'Battle.DbgEngine.Event.BattleLogicEvent',b'Battle.DbgEngine.Effect.BattleEffectServer']:self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('BEBeforeUseCard',asset_overrides.get('BEBeforeUseCard'));self.setglobal(L,b'_payment_class')

    def evaluate(self,v,player_global=None):
        # Build a card with the original X-cost parsing and resolver.
        super().run(dict(cfgCost=v['cfgCost'],energy=v['energy'],originCost=2,delta=0,harmonize=0,fixedSwitches={},keeper=False,keeperCost=None,pvp=False))
        L=self.state;self.top(L,0);self.observed={'consumeRequests':[],'ignoreCost':None,'forceModeCleared':False}
        self.getglobal(L,b'_cost_self')
        self.method('AllowIgnoreCost',lambda s:(self.boolean(s,v['allowIgnoreCost']),1)[1])
        self.method('AddConsumeEnergyStats',lambda s:0);self.top(L,0)
        self.table(L,0,3)
        self.method('GetProperty',lambda s:(self.number(s,v['energy']),1)[1])
        self.method('EnergyEnough',lambda s:(self.boolean(s,v['energyEnough']),1)[1])
        def consume(s):
            request=self.tonumber(s,2,None);self.observed['consumeRequests'].append(request);self.number(s,request);return 1
        self.method('ConsumeEnergy',consume);self.setglobal(L,b'_payment_player')
        if player_global is not None:self.getglobal(L,player_global);self.setglobal(L,b'_payment_player')
        self.table(L,0,4);self.table(L,0,1);self.number(L,9);self.setfield(L,-2,b'castRoleUid');self.setfield(L,-2,b'effectConfig')
        self.table(L,0,3);self.table(L,0,1);self.method('GetCurCamp',lambda s:(self.number(s,1),1)[1]);self.setfield(L,-2,b'boutMgr')
        self.table(L,0,1);self.method('GetPlayer',lambda s:(self.getglobal(s,b'_payment_player'),1)[1]);self.setfield(L,-2,b'roleMgr');self.method('DebugS',lambda s:0);self.setfield(L,-2,b'battleEngine')
        self.table(L,0,5)
        self.method('IsAttachPost',lambda s:(self.boolean(s,v['attached']),1)[1])
        self.method('HasMemberValue',lambda s:(self.boolean(s,v['forceMode'] is not None),1)[1])
        self.method('GetMemberValue',lambda s:(self.push(s,v['forceMode']),1)[1])
        def clear(s):self.observed['forceModeCleared']=self.kind(s,3)==0;return 0
        self.method('SetMemberValue',clear);self.table(L,0,1)
        def ignore(s):self.observed['ignoreCost']=None if self.kind(s,3)==0 else self.tonumber(s,3,None);return 0
        self.method('SetMemberValue',ignore);self.setfield(L,-2,b'cmdParser');self.setfield(L,-2,b'cmdServer');self.setglobal(L,b'_payment_self')
        self.table(L,0,1);self.number(L,v['cost']);self.setfield(L,-2,b'castValue');self.setglobal(L,b'_payment_data')
        self.getglobal(L,b'_payment_class');self.getfield(L,-1,b'__CostEnergy');self.getglobal(L,b'_payment_self');self.getglobal(L,b'_cost_self');self.getglobal(L,b'_payment_data');self.check(self.call(L,3,0,0,0,None))
        self.getglobal(L,b'_payment_data');self.getfield(L,-1,b'castValue');self.observed['castValue']=self.tonumber(L,-1,None)
        if self.errors:raise RuntimeError(self.errors)
        return self.observed

if __name__=='__main__':
    o=PaymentBranchOracle();fixtures=[]
    for cfg,cost in [('2',3),('X',-1),('X3',-1)]:
        for energy in [0,2,5]:
            for mode in [None,1,2,3]:
                for attached in [False,True]:
                    for allow in [False,True]:
                        v=dict(cfgCost=cfg,cost=cost,energy=energy,forceMode=mode,attached=attached,allowIgnoreCost=allow,energyEnough=cost<=energy)
                        fixtures.append({'input':v,'expected':o.evaluate(v)})
    report={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original BEBeforeUseCard.__CostEnergy and card variable parser/resolver. Explicit EnergyEnough decision; ConsumeEnergy records request and returns it without mutating resources, stats/log hooks are spies. No payment, event dispatch, play legality or gameplay.','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BEBeforeUseCard','BattleCardServer','BattleUtilServer','BattleConst']},'fixtures':fixtures}
    (ROOT/'tests/synthetic/original-card-payment-branches.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(fixtures),'original payment branch cases')
