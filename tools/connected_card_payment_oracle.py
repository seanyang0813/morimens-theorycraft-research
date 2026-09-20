"""Original before-use branch -> player payment -> energy property mutation."""
import json
from card_payment_branch_oracle import PaymentBranchOracle
from energy_payment_oracle import EnergyOracle,ROOT

class ConnectedPaymentOracle(PaymentBranchOracle,EnergyOracle):
    def connected(self,v):
        self.prepare(v['energy'])
        branch=self.evaluate(v,player_global=b'_energy_player')
        L=self.state;self.top(L,0);self.getglobal(L,b'_hp_property');self.getfield(L,-1,b'properties');self.getfield(L,-1,b'energy');after=self.tonumber(L,-1,None)
        self.getglobal(L,b'_cost_self');self.getfield(L,-1,b'realCost');reported=self.tonumber(L,-1,None)
        return {key:branch[key] for key in ['ignoreCost','forceModeCleared','castValue']}|{'energyAfter':after,'energyLost':v['energy']-after,'reportedCost':reported,'events':self.events}

if __name__=='__main__':
    o=ConnectedPaymentOracle();fixtures=[]
    for cfg,cost in [('2',3),('X',-1),('X3',-1)]:
        for energy in [0,0.5,2,5]:
            for mode in [None,1,2,3]:
                for attached in [False,True]:
                    for allow in [False,True]:
                        v=dict(cfgCost=cfg,cost=cost,energy=energy,forceMode=mode,attached=attached,allowIgnoreCost=allow,energyEnough=cost<=energy)
                        fixtures.append({'input':v,'expected':o.connected(v)})
    names=['BEBeforeUseCard','BattleUnitPlayer','BattlePropertyServer','BattleCardServer','BattleUtilServer','BattleConst']
    report={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original __CostEnergy calls original EnergyEnough/ConsumeEnergy and original property subtraction in one Lua state. Original card variable parser/resolver, supplied use cost and command flags. Observed callbacks, one-field clone, role/property lookup adapters. No full DoEffect, cost derivation, play checks, event listeners or gameplay.','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in names},'fixtures':fixtures}
    (ROOT/'tests/synthetic/original-connected-card-payment.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print('Generated',len(fixtures),'connected original card payment cases')
