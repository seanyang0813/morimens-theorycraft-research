"""Original Awaker gain, maximum calculation and property storage chain."""
import ctypes as C
import itertools,json
from hp_property_oracle import HpPropertyOracle,ROOT
class GainOracle(HpPropertyOracle):
    def __init__(self):
        super().__init__();L=self.state
        self.pushstring=self.lib.lua_pushstring;self.pushstring.argtypes=[C.c_void_p,C.c_char_p]
        def require(s):
            name=self.string(s,1,None)
            known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc'}
            if name in known:self.getglobal(s,known[name])
            elif name in [b'Battle.DbgEngine.Role.BattleUnitBase',b'Battle.Util.PathUtils']:self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('BattleUnitAwaker');self.setglobal(L,b'_gain_awaker')
    def run(self,v):
        L=self.state;self.top(L,0);self.events=[]
        self.getglobal(L,b'_hp_property');self.table(L,0,5)
        for key,value in {'ulti_energy':v['energy'],**v['maximumProperties']}.items():self.number(L,value);self.setfield(L,-2,key.encode())
        self.setfield(L,-2,b'properties');self.top(L,0)
        self.table(L,0,2);self.boolean(L,v['ignoreMax']);self.setfield(L,-2,b'ignoreMax')
        if v.get('castValue') is not None:self.number(L,v['castValue']);self.setfield(L,-2,b'castValue')
        self.setglobal(L,b'_gain_extra')
        self.getglobal(L,b'_gain_awaker');self.getfield(L,-1,b'GainUltiEnergy');self.table(L,0,2)
        def get(s):
            key=self.string(s,2,None);self.getglobal(s,b'_hp_property');self.getfield(s,-1,b'properties');self.getfield(s,-1,key);return 1
        self.method('GetProperty',get);self.getglobal(L,b'_hp_property');self.setfield(L,-2,b'property')
        self.number(L,v['request']);self.getglobal(L,b'_gain_extra');self.check(self.call(L,3,1,0,0,None));returned=self.tonumber(L,-1,None)
        self.getglobal(L,b'_hp_property');self.getfield(L,-1,b'properties');self.getfield(L,-1,b'ulti_energy');after=self.tonumber(L,-1,None);self.top(L,0)
        self.getglobal(L,b'_hp_property');self.getfield(L,-1,b'GetMaxUltiEnergy');self.getglobal(L,b'_hp_property');self.check(self.call(L,1,1,0,0,None));maximum=self.tonumber(L,-1,None)
        self.getglobal(L,b'_gain_extra');self.getfield(L,-1,b'castValue');cast=self.tonumber(L,-1,None) if self.string(L,-1,None) is not None else None
        if self.errors:raise RuntimeError(self.errors)
        return {'returned':returned,'energyAfter':after,'energyGained':after-v['energy'],'maximum':maximum,'castValue':cast,'events':self.events}
if __name__=='__main__':
    o=GainOracle();fixtures=[]
    maxima=[{'ulti_energy_max':100,'ulti_energy_cost_per':0,'ulti_energy_cost_flat':0,'ulti_energy_max_per':0},{'ulti_energy_max':100,'ulti_energy_cost_per':-20,'ulti_energy_cost_flat':10,'ulti_energy_max_per':25},{'ulti_energy_max':0,'ulti_energy_cost_per':0,'ulti_energy_cost_flat':0,'ulti_energy_max_per':0}]
    for energy,request,maximum,ignore in itertools.product([0,99,99.5,100,100.5,120],[-1,0,0.1,0.5,1,10,200],maxima,[False,True]):
        v={'energy':energy,'request':request,'maximumProperties':maximum,'ignoreMax':ignore};fixtures.append({'input':v,'expected':o.run(v)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleUnitAwaker','BattlePropertyServer']},'scope':'252 connected original GainUltiEnergy/GetMaxUltiEnergy/ChangeProperty/AddProperty cases. Explicit initialized properties, source ignoreMax flag and GetProperty adapter. Property owner/send callbacks observed, not dispatched. No calculation effect, other source fields, full battle or gameplay.','fixtures':fixtures}
    (ROOT/'tests/synthetic/original-ulti-energy-gain.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Generated',len(fixtures),'connected ultimate-energy storage cases')
