"""Original non-keeper PvE CanUseCard with explicit state and energy adapters."""
import json
from behit_hp_oracle import BeHitHpOracle,ROOT

class PlayCheckOracle(BeHitHpOracle):
    def run(self,v):
        L=self.state;self.top(L,0);self.reset=False
        self.table(L,0,10)
        if v['inHand']:self.enum('CardDeck','HandDeck');self.setfield(L,-2,b'deck')
        def type_match(s):
            self.boolean(s,v['strike'] and self.string(s,2,None)==b'Card_Strike');return 1
        self.method('CardTypeMatch',type_match)
        self.method('JudgeCost',lambda s:(self.boolean(s,v['judgeCost']),1)[1])
        self.method('GetProperty',lambda s:(self.number(s,v['cardUseless']),1)[1])
        self.method('GetCmdId',lambda s:(self.number(s,1) if v['commandExists'] else self.nil(s),1)[1])
        self.method('IsXCost',lambda s:(self.boolean(s,v['variable']),1)[1])
        self.method('GetUseCost',lambda s:(self.number(s,2),1)[1])
        self.method('AllowIgnoreCost',lambda s:(self.boolean(s,v['allowIgnoreCost']),1)[1])
        def reset(s):self.reset=True;return 0
        self.method('ResetAllowIgnoreCost',reset);self.setglobal(L,b'_play_card')
        self.table(L,0,2)
        self.method('EnergyEnough',lambda s:(self.boolean(s,v['energyEnough']),1)[1])
        def player_prop(s):
            key=self.string(s,2,None).decode();self.number(s,{'forbit_use_card':v['playerForbid'],'forbit_strike_card':v['playerForbidStrike']}[key]);return 1
        self.method('GetProperty',player_prop);self.setglobal(L,b'_play_player')
        self.table(L,0,4);self.number(L,1);self.setfield(L,-2,b'camp')
        self.method('IsDead',lambda s:(self.boolean(s,v['dead']),1)[1])
        props={'card_useless':'ownerUseless','PVPComa':'coma','PVPImmue_Coma':'comaImmunity','forbit_use_card':'ownerForbid','forbit_strike_card':'ownerForbidStrike'}
        def owner_prop(s):
            try:self.number(s,v[props[self.string(s,2,None).decode()]]);return 1
            except Exception as error:self.errors.append(str(error));self.number(s,0);return 1
        self.method('GetProperty',owner_prop);self.table(L,0,4)
        self.method('GetObj',lambda s:(self.getglobal(s,b'_play_card') if v['cardExists'] else self.nil(s),1)[1]);self.method('Warn',lambda s:0);self.method('IsPVP',lambda s:(self.boolean(s,False),1)[1])
        self.table(L,0,1);self.method('GetPlayer',lambda s:(self.getglobal(s,b'_play_player'),1)[1]);self.setfield(L,-2,b'roleMgr');self.setfield(L,-2,b'battleEngine');self.setglobal(L,b'_play_owner')
        self.getglobal(L,b'_behit_unit');self.getfield(L,-1,b'CanUseCard');self.getglobal(L,b'_play_owner');self.number(L,1);self.nil(L);self.nil(L);self.check(self.call(L,4,2,0,0,None))
        result={'allowed':bool(self.tobool(L,-2)),'reasonCode':None if self.kind(L,-1)==0 else self.tonumber(L,-1,None),'resetAllowIgnoreCost':self.reset}
        if self.errors:raise RuntimeError(self.errors)
        return result

if __name__=='__main__':
    o=PlayCheckOracle();base=dict(cardExists=True,inHand=True,judgeCost=True,cardUseless=0,ownerUseless=0,commandExists=True,dead=False,coma=0,comaImmunity=0,ownerForbid=0,playerForbid=0,strike=False,ownerForbidStrike=0,playerForbidStrike=0,variable=False,energyEnough=True,allowIgnoreCost=False)
    variants=[{}, {'cardExists':False},{'inHand':False},{'judgeCost':False},{'cardUseless':1},{'ownerUseless':1},{'commandExists':False},{'dead':True},{'coma':1},{'coma':1,'comaImmunity':1},{'ownerForbid':1},{'playerForbid':1},{'strike':True,'ownerForbidStrike':1},{'strike':True,'playerForbidStrike':1},{'ownerForbidStrike':1}]
    fixtures=[]
    for variant in variants:
        for variable in [False,True]:
            for enough,allow in [(True,False),(False,False),(False,True)]:
                v={**base,**variant,'variable':variable,'energyEnough':enough,'allowIgnoreCost':allow};fixtures.append({'input':v,'expected':o.run(v)})
    report={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original CanUseCard non-keeper PvE path; all property, identity, card-method and EnergyEnough results supplied, reset side effect observed. No target checks, turn gate, forced-play path, payment or gameplay.','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleUnitBase','BattleConst']},'fixtures':fixtures}
    (ROOT/'tests/synthetic/original-card-play-check.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print('Generated',len(fixtures),'original PvE card check cases')
