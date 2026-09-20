"""Original effect -> calculation -> source -> Awaker/property storage in one Lua state."""
import ctypes as C
import itertools,json
from ulti_energy_gain_oracle import GainOracle,ROOT
class ConnectedOracle(GainOracle):
    def __init__(self):
        super().__init__();L=self.state
        self.rawseti=self.lib.lua_rawseti;self.rawseti.argtypes=[C.c_void_p,C.c_int,C.c_longlong]
        self.boolread=self.lib.lua_toboolean;self.boolread.argtypes=[C.c_void_p,C.c_int];self.boolread.restype=C.c_int
        def newclass(s):
            self.table(s,0,50);self.table(s,0,1);self.method('DoEffect',lambda s:0);return 2
        self.getglobal(L,b'_oracle_config_system');self.method('NewClass',newclass);self.top(L,0)
        def require(s):
            name=self.string(s,1,None);known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.DbgEngine.Effect.BattleEffectServer':b'_connected_base'}
            if name in known:self.getglobal(s,known[name])
            elif name==b'Battle.Ecs.BattleEntity':self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('BattleEffectServer');self.setglobal(L,b'_connected_base');self.module('BEGainUltiEnergy');self.setglobal(L,b'_connected_effect')
    def attach(self,global_name,name):
        L=self.state;self.getglobal(L,global_name);self.getfield(L,-1,name.encode());self.setfield(L,-3,name.encode());self.top(L,-2)
    def run_connected(self,v):
        L=self.state;self.top(L,0);self.events=[];t=v['targets'][0];cal=t['calculation']
        self.getglobal(L,b'_hp_property');self.table(L,0,20)
        for key,value in {'ulti_energy':t['energy'],**t['maximumProperties'],**cal['properties']}.items():self.number(L,value);self.setfield(L,-2,key.encode())
        self.setfield(L,-2,b'properties');self.top(L,0)
        self.table(L,0,5);self.number(L,7);self.setfield(L,-2,b'uid')
        def get(s):
            key=self.string(s,2,None);self.getglobal(s,b'_hp_property');self.getfield(s,-1,b'properties');self.getfield(s,-1,key);return 1
        def role(s):self.boolean(s,True);return 1
        self.method('GetProperty',get);self.method('IsRoleType',role);self.getglobal(L,b'_hp_property');self.setfield(L,-2,b'property');self.attach(b'_gain_awaker','GainUltiEnergy');self.setglobal(L,b'_connected_role')
        if cal['card'] is not None:
            self.table(L,0,2);self.method('GetProperty',get)
            def match(s):self.boolean(s,cal['card']['matchesEnergyCardTypes']);return 1
            self.method('CardTypeMatch',match);self.setglobal(L,b'_connected_card')
        self.table(L,0,12)
        for key,value in [('castRoleUid',7),('cardUid',8),('skillConfigId',3)]:self.number(L,value);self.setfield(L,-2,key.encode())
        for name in ['GetRealUltiEnergy','__GetShowUltiEnergy','__GetFinalUltiEnergy']:self.attach(b'_oracle_cmd',name)
        def tags(s):
            self.table(s,len(cal['skillTags']),0)
            for i,tag in enumerate(cal['skillTags'],1):self.pushstring(s,tag.encode());self.rawseti(s,-2,i)
            return 1
        def dimension(s):self.number(s,cal['dimension']);return 1
        def plus(s):self.number(s,0);return 1
        self.method('GetSkillType',tags);self.method('GetDimensionFixPer',dimension);self.method('GetSkillArgsPlus',plus)
        self.table(L,0,2)
        def lookup(s):
            if self.tonumber(s,2,None)==7:self.getglobal(s,b'_connected_role')
            elif cal['card'] is not None:self.getglobal(s,b'_connected_card')
            else:self.nil(s)
            return 1
        self.method('GetObj',lookup);self.method('Debug',lambda s:0);self.setfield(L,-2,b'battleEngine');self.setglobal(L,b'_connected_command')
        self.getglobal(L,b'_connected_effect');self.getfield(L,-1,b'DoEffect');self.table(L,0,6)
        self.table(L,3,0)
        for i,x in enumerate(v['parameters'],1):
            if x is not None:self.number(L,x);self.rawseti(L,-2,i)
        self.setfield(L,-2,b'params');self.table(L,1,0);self.getglobal(L,b'_connected_role');self.rawseti(L,-2,1);self.setfield(L,-2,b'targets')
        self.table(L,0,1);self.number(L,7);self.setfield(L,-2,b'castRoleUid');self.setfield(L,-2,b'effectConfig');self.number(L,2);self.setfield(L,-2,b'cmdServerUid');self.getglobal(L,b'_connected_command');self.setfield(L,-2,b'cmdServer');self.attach(b'_connected_base','GetPropertyChangeSource')
        self.check(self.call(L,1,1,0,0,None));returned=bool(self.boolread(L,-1))
        self.getglobal(L,b'_hp_property');self.getfield(L,-1,b'properties');self.getfield(L,-1,b'ulti_energy');energy=self.tonumber(L,-1,None)
        if self.errors:raise RuntimeError(self.errors)
        return {'returned':returned,'energyAfter':energy,'events':self.events}
if __name__=='__main__':
    o=ConnectedOracle();fixtures=[]
    for base,times,energy,bonus,card,tags in itertools.product([-1,0,10.1],[0,1,2.1],[0,95,100],[0,25],[None,{'matchesEnergyCardTypes':False},{'matchesEnergyCardTypes':True}],[[],['Card_Strike','Card_Skill']]):
        cal={'dimension':20,'card':card,'casterEligible':True,'skillTags':tags,'properties':{'ulti_energy_per':bonus,'i_ulti_energy_per':0,'ulti_energy_efficiency':0,'ulti_energy_plus':0,'gain_ulti_energy_per':0,'gain_ulti_energy_plus':0,'card_ulti_per':25,'card_ulti_plus':3,'o_ulti_energy_per':40,'ulti_per_strikecard':25,'ulti_per_skillcard':50}}
        v={'schemaVersion':1,'kind':'morimens-ulti-energy-experiment','build':'pc-res144-build51','otherEvents':'assumed-absent','parameters':[base,times,1],'source':{'castRoleUid':7,'cmdServerUid':2,'skillConfigId':3},'targetOrder':[7],'targets':[{'uid':7,'role':'Awaker','energy':energy,'maximumProperties':{'ulti_energy_max':100,'ulti_energy_cost_per':0,'ulti_energy_cost_flat':0,'ulti_energy_max_per':0},'calculation':cal}]}
        fixtures.append({'input':v,'expected':o.run_connected(v)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BEGainUltiEnergy','BattleEffectServer','BattleCmdServer','BattleUtilServer','BattleUnitAwaker','BattlePropertyServer','BattleConst']},'scope':'324 connected original effect/calculation/source/Awaker/property-storage cases. One self-target Awaker, ordinary subtype, explicit role/property/dimension/card-match/tag adapters; card presence and two mapped tags varied. Presentation no-op, owner/send callbacks observed only. No listeners, full command or gameplay.','fixtures':fixtures}
    (ROOT/'tests/synthetic/original-connected-ulti-energy.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Generated',len(fixtures),'connected original full energy-path cases')
