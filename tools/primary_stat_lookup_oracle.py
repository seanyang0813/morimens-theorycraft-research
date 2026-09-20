"""Execute original character/quality/talent lookup and original compiled primary formulas."""
import ctypes as C
import json
from primary_stat_oracle import PrimaryStatOracle, ROOT

class PrimaryLookupOracle(PrimaryStatOracle):
    def __init__(self):
        super().__init__();L=self.state;self.callbacks=[];self.errors=[]
        self.nil=self.lib.lua_pushnil;self.nil.argtypes=[C.c_void_p];self.nil.restype=None
        constants=json.loads((ROOT/'research/extracted/config/Constant.json').read_text(encoding='utf-8'))
        self.table(L,0,0);self.setglobal(L,b'CommonDefine')
        self.table(L,0,1)
        def identity(s):self.pushvalue(s,1);return 1
        self.callback(identity);self.setfield(L,-2,b'NewEnum');self.setglobal(L,b'System')
        self.table(L,0,5)
        for name in ['AwakerConfig','AwakerUpgrade','AwakerTalent']:
            self.module(name);self.setfield(L,-2,name.encode())
        def constant(s):
            key=self.string(s,1,None).decode()
            try:
                value=constants[key]['Data']['1']
                if not isinstance(value,(int,float)):raise ValueError('Non-numeric constant '+key)
                (self.integer if isinstance(value,int) else self.number)(s,value);return 1
            except Exception as e:self.errors.append(str(e));self.nil(s);return 1
        self.callback(constant);self.setfield(L,-2,b'GetConstant');self.setglobal(L,b'DT')
        self.table(L,0,1)
        def getfunc(s):
            key=self.string(s,1,None)
            if key is None:self.errors.append('Missing formula key');self.nil(s);return 1
            self.getglobal(s,b'_primary_formulas');self.getfield(s,-1,key)
            if self.kind(s,-1)!=6:self.errors.append('Unknown compiled expression '+repr(key))
            return 1
        self.callback(getfunc);self.setfield(L,-2,b'GetFunc');self.setglobal(L,b'LoadFuncUtils')
        self.table(L,0,2)
        def log(s):self.errors.append('Original reader logged an error');return 0
        for name in [b'Info',b'Error']:self.callback(log);self.setfield(L,-2,name)
        self.setglobal(L,b'Logger')
        self.module('AwakerDataUtils');self.setglobal(L,b'_primary_reader')
        if self.errors:raise RuntimeError(self.errors)
    def callback(self,fn):
        wrapped=C.CFUNCTYPE(C.c_int,C.c_void_p)(fn);self.callbacks.append(wrapped);self.pushclosure(self.state,wrapped,0)
    def lookup(self,character,level,stat,talent,rank):
        L=self.state;self.top(L,0);self.getglobal(L,b'_primary_reader');self.getfield(L,-1,b'GetAwakerBaseAttrValue')
        self.integer(L,character);self.integer(L,level)
        push=self.lib.lua_pushstring;push.argtypes=[C.c_void_p,C.c_char_p];push.restype=C.c_void_p;push(L,stat.encode())
        self.integer(L,talent);self.integer(L,rank);self.check(self.call(L,5,1,0,0,None))
        if self.errors:raise RuntimeError(self.errors)
        if self.kind(L,-1)!=3:raise ValueError('Non-numeric original stat')
        return self.tonumber(L,-1,None)

if __name__=='__main__':
    audit=json.loads((ROOT/'research/evidence/catalog-primary-stat-audit.json').read_text(encoding='utf-8'))
    characters=json.loads((ROOT/'research/extracted/config/AwakerConfig.json').read_text(encoding='utf-8'))
    o=PrimaryLookupOracle();fixtures=[]
    for row in audit['characters']:
        if row['matchCount']!=1 or len(row['attributeTalents'])!=1:continue
        talent=row['attributeTalents'][0];c=characters[str(row['clientId'])]
        for level in [1,14,24,70,90]:
            for rank in [0,1,5]:
                for stat in ['atk','def','physique']:
                    fixtures.append({'characterId':row['catalogId'],'clientId':row['clientId'],'level':level,'stat':stat,
                        'talentId':talent['clientTalentId'],'rank':rank,
                        'resolvedInputs':{'build':'pc-res144-build51','base':c[stat],'extra':c[stat+'_extra'],'upgradeLevel':level+row['qualityLevelOffset'],'talentBonusLevels':talent['bonusLevelsByRank'].get(str(rank),0)},
                        'expected':o.lookup(row['clientId'],level,stat,talent['clientTalentId'],rank)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51',
        'scope':'Original GetAwakerBaseAttrValue, GetUpgradeConfig, PreMakeUpgradeConfig and GetTalentAttrLv with original configuration tables and compiled FuncTable closures. GetConstant adapter reads exported constant values; GetFunc adapter selects original closure; enum initialization adapter is identity. No Soulforge, battle assembly or gameplay validation.',
        'sourceHashes':{name:o.assets[name+'.lua']['sha256'] for name in ['AwakerDataUtils','AwakerConfig','AwakerUpgrade','AwakerTalent','Constant','FuncTable']},'fixtures':fixtures}
    (ROOT/'tests/synthetic/original-primary-stat-lookup.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(fixtures),'original connected primary-stat lookup cases')
