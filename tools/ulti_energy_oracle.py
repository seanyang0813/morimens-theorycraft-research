"""Connected original ultimate-energy calculation with no card or skill tags."""
import itertools,json
import ctypes as C
from target_runtime_oracle import TargetOracle,ROOT
class UltiOracle(TargetOracle):
    def run(self,v):
        L=self.state;self.top(L,0);reads=[]
        rawset=self.lib.lua_rawseti;rawset.argtypes=[C.c_void_p,C.c_int,C.c_longlong]
        push=self.lib.lua_pushstring;push.argtypes=[C.c_void_p,C.c_char_p]
        self.table(L,0,2)
        def prop(s):
            key=self.string(s,2,None).decode();reads.append(key)
            if key not in v['properties']:self.errors.append(key);self.number(s,0)
            else:self.number(s,v['properties'][key])
            return 1
        self.method('GetProperty',prop)
        def role(s):self.boolean(s,v.get('casterEligible',True));return 1
        self.method('IsRoleType',role);self.setglobal(L,b'_ulti_role')
        if v.get('card') is not None:
            self.table(L,0,2);self.method('GetProperty',prop)
            def match(s):self.boolean(s,v['card']['matchesEnergyCardTypes']);return 1
            self.method('CardTypeMatch',match);self.setglobal(L,b'_ulti_card')
        self.getglobal(L,b'_oracle_cmd');self.getfield(L,-1,b'GetRealUltiEnergy');self.table(L,0,8)
        self.number(L,1);self.setfield(L,-2,b'castRoleUid');self.number(L,2);self.setfield(L,-2,b'cardUid')
        for name in ['__GetShowUltiEnergy','__GetFinalUltiEnergy']:
            self.getglobal(L,b'_oracle_cmd');self.getfield(L,-1,name.encode());self.setfield(L,-3,name.encode());self.top(L,-2)
        def tags(s):
            self.table(s,0,0)
            for i,tag in enumerate(v.get('skillTags',[]),1):push(s,tag.encode());rawset(s,-2,i)
            return 1
        def dimension(s):self.number(s,v['dimension']);return 1
        def plus(s):self.number(s,0);return 1
        self.method('GetSkillType',tags);self.method('GetDimensionFixPer',dimension);self.method('GetSkillArgsPlus',plus)
        self.table(L,0,2)
        def lookup(s):
            if self.tonumber(s,2,None)==1:self.getglobal(s,b'_ulti_role')
            elif v.get('card') is not None:self.getglobal(s,b'_ulti_card')
            else:self.nil(s)
            return 1
        def debug(s):return 0
        self.method('GetObj',lookup);self.method('Debug',debug);self.setfield(L,-2,b'battleEngine')
        self.number(L,v['base']);self.getglobal(L,b'_ulti_role');self.check(self.call(L,3,1,0,0,None))
        if self.errors:raise RuntimeError(self.errors)
        return {'value':self.tonumber(L,-1,None),'propertyReads':reads}
if __name__=='__main__':
    o=UltiOracle();fixtures=[]
    for base,outer,inside,eff,dim,target in itertools.product([-3,0,10.2],[0,50],[0,25],[0,30],[0,20],[-150,0,50]):
        v={'base':base,'dimension':dim,'properties':{'ulti_energy_per':outer,'i_ulti_energy_per':inside,'ulti_energy_efficiency':eff,'ulti_energy_plus':2,'gain_ulti_energy_per':target,'gain_ulti_energy_plus':1}}
        fixtures.append({'input':v,'expected':o.run(v)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleCmdServer','BattleUtilServer']},'scope':'144 connected GetRealUltiEnergy/show utility/final cases. No card, empty skill tags, ordinary subtype, Awaker/Monster caster adapter, explicit properties/dimension, zero argument bonus. No gain/storage effect, event dispatch or gameplay.','fixtures':fixtures}
    (ROOT/'tests/synthetic/original-ulti-energy.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Generated',len(fixtures),'connected ultimate-energy cases')
