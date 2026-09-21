"""Original player ConsumeEnergy -> original property subtraction; event listeners absent."""
import ctypes as C
import json
from hp_property_oracle import HpPropertyOracle,ROOT

class EnergyOracle(HpPropertyOracle):
    def __init__(self,asset_overrides=None):
        asset_overrides=asset_overrides or {}
        super().__init__(asset_overrides);L=self.state
        self.pushstring=self.lib.lua_pushstring;self.pushstring.argtypes=[C.c_void_p,C.c_char_p];self.pushstring.restype=C.c_char_p
        empty={b'Battle.DbgEngine.Role.BattleUnitBase',b'Battle.DbgEngine.Role.Component.SchoolCompPVE',b'Battle.DbgEngine.Role.Component.SchoolCompPVP',b'Battle.DbgEngine.Stats.BattleStatsMgrPVP',b'Battle.DbgEngine.Card.BattleKeeperSkillServer',b'Battle.DbgEngine.Cmd.BattleCmdParser'}
        def require(s):
            name=self.string(s,1,None)
            known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.Util.BattleUtilServer':b'_oracle_util'}
            if name in known:self.getglobal(s,known[name])
            elif name==b'Battle.DbgEngine.Event.BattleLogicEvent':
                self.table(s,0,1);self.pushstring(s,b'ConsumeEnergy');self.setfield(s,-2,b'ConsumeEnergy')
            elif name in empty:self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('BattleUnitPlayer',asset_overrides.get('BattleUnitPlayer'));self.setglobal(L,b'_energy_player_class')
        # Only castValue is supplied in the source data for this bounded probe.
        def clone(s):
            self.table(s,0,1);self.getfield(s,1,b'castValue');self.setfield(s,-2,b'castValue');return 1
        self.getglobal(L,b'table');self.method('clone',clone);self.top(L,0)

    def prepare(self,energy):
        L=self.state;self.top(L,0);self.events=[];self.records=[]
        self.getglobal(L,b'_hp_property');self.table(L,0,1);self.number(L,energy);self.setfield(L,-2,b'energy');self.setfield(L,-2,b'properties');self.top(L,0)
        self.table(L,0,4);self.number(L,1);self.setfield(L,-2,b'uid');self.getglobal(L,b'_hp_property');self.setfield(L,-2,b'property')
        def get(s):
            self.getglobal(s,b'_hp_property');self.getfield(s,-1,b'properties');self.getfield(s,-1,b'energy');return 1
        self.method('GetProperty',get);self.table(L,0,2)
        def event(s):
            row={'kind':'event'}
            for key in ['castValue','realCost']:
                self.getfield(s,3,key.encode());row[key]=self.tonumber(s,-1,None);self.top(s,-2)
            self.events.append(row);return 0
        self.method('CreateEventEffect',event);self.table(L,0,1)
        def record(s):self.events.append({'kind':'record','delta':self.tonumber(s,4,None),'energyAfter':self.tonumber(s,5,None)});return 0
        self.method('OnPropertyChanged',record);self.setfield(L,-2,b'recordMgr');self.setfield(L,-2,b'battleEngine')
        for name in ['ConsumeEnergy','EnergyEnough']:
            self.getglobal(L,b'_energy_player_class');self.getfield(L,-1,name.encode());self.setfield(L,-3,name.encode());self.top(L,-2)
        self.setglobal(L,b'_energy_player')

    def run(self,energy,request):
        self.prepare(energy);L=self.state
        self.getglobal(L,b'_energy_player_class');self.getfield(L,-1,b'ConsumeEnergy');self.getglobal(L,b'_energy_player');self.number(L,request);self.table(L,0,0);self.number(L,9);self.check(self.call(L,4,1,0,0,None));reported=self.tonumber(L,-1,None)
        self.getglobal(L,b'_hp_property');self.getfield(L,-1,b'properties');self.getfield(L,-1,b'energy');after=self.tonumber(L,-1,None)
        if self.errors:raise RuntimeError(self.errors)
        return {'reportedCost':reported,'energyAfter':after,'energyLost':energy-after,'events':self.events}

if __name__=='__main__':
    o=EnergyOracle();fixtures=[]
    for energy in [0,0.5,2,5,99]:
        for request in [-1,0,0.25,2,5,100]:fixtures.append({'input':{'energy':energy,'request':request},'expected':o.run(energy,request)})
    report={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original ConsumeEnergy -> SubProperty/BeforeSub/AfterSub/RefreshMaxLimit, supplied initialized energy 0..99 and request >=0 or -1 sentinel. GetProperty and one-field table.clone adapters, observational property/event/record callbacks. No event listeners, before-use branching, play eligibility or gameplay.','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleUnitPlayer','BattlePropertyServer']},'fixtures':fixtures}
    (ROOT/'tests/synthetic/original-energy-payment.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print('Generated',len(fixtures),'original connected energy payment cases')
