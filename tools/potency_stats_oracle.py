"""Original ordered potency chains and attribute accumulation; offline synthetic evidence."""
import ctypes as C
import json
from primary_stat_lookup_oracle import PrimaryLookupOracle, ROOT
class PotencyOracle(PrimaryLookupOracle):
    def __init__(self):
        super().__init__();L=self.state
        self.rawgeti=self.lib.lua_rawgeti;self.rawgeti.argtypes=[C.c_void_p,C.c_int,C.c_longlong];self.rawgeti.restype=C.c_int
        self.rawlen=self.lib.lua_rawlen;self.rawlen.argtypes=[C.c_void_p,C.c_int];self.rawlen.restype=C.c_size_t
        self.pushstring=self.lib.lua_pushstring;self.pushstring.argtypes=[C.c_void_p,C.c_char_p];self.pushstring.restype=C.c_void_p
        self.top(L,0);self.getglobal(L,b'table');self.getglobal(L,b'next');self.setfield(L,-2,b'next')
        self.top(L,0);self.getglobal(L,b'CommonDefine')
        for enum in [b'AwakerPotencyType',b'AwakerPotencyEffectType']:
            self.table(L,0,1);self.pushstring(L,b'Attr_Promote');self.setfield(L,-2,b'Attr_Promote');self.setfield(L,-2,enum)
        self.top(L,0);self.getglobal(L,b'DT')
        for name in ['AwakerPotency','ActorAttrType']:self.module(name);self.setfield(L,-2,name.encode())
        self.top(L,0);self.table(L,0,1)
        def identity(s):self.pushvalue(s,1);return 1
        self.callback(identity);self.setfield(L,-2,b'Text');self.setglobal(L,b'LT')
        self.getglobal(L,b'Logger')
        def warning(s):self.errors.append('Original potency chain warning');return 0
        self.callback(warning);self.setfield(L,-2,b'Warn');self.top(L,0)
        self.module('AwakerDataUtils');self.setglobal(L,b'_primary_reader')
        self.getglobal(L,b'_primary_reader')
        def no_owned_data(s):self.nil(s);return 1
        self.callback(no_owned_data);self.setfield(L,-2,b'GetAwakerData');self.top(L,0)
    def chain(self,character):
        L=self.state;self.top(L,0);self.getglobal(L,b'_primary_reader');self.getfield(L,-1,b'GetAwakerPotencyList');self.integer(L,character);self.check(self.call(L,1,1,0,0,None))
        values=[]
        for i in range(1,self.rawlen(L,-1)+1):
            self.rawgeti(L,-1,i);self.getfield(L,-1,b'tid');values.append(int(self.tonumber(L,-1,None)));self.top(L,-3)
        if self.errors:raise RuntimeError(self.errors)
        return values
    def attrs(self,character,target):
        L=self.state;self.top(L,0);self.getglobal(L,b'_primary_reader');self.getfield(L,-1,b'GetPotencyAddAttrs');self.integer(L,character);self.integer(L,target);self.check(self.call(L,2,1,0,0,None))
        values={}
        for i in range(1,self.rawlen(L,-1)+1):
            self.rawgeti(L,-1,i);self.getfield(L,-1,b'type');name=self.string(L,-1,None).decode();self.top(L,-2)
            self.getfield(L,-1,b'count');values[name]=self.tonumber(L,-1,None);self.top(L,-3)
        if self.errors:raise RuntimeError(self.errors)
        return values
if __name__=='__main__':
    data=json.loads((ROOT/'research/evidence/client-build-data.json').read_text(encoding='utf-8'))
    configs=json.loads((ROOT/'research/extracted/config/AwakerPotency.json').read_text(encoding='utf-8'))
    attrcfg=json.loads((ROOT/'research/extracted/config/ActorAttrType.json').read_text(encoding='utf-8'))
    o=PotencyOracle();characters=[];fixtures=[]
    for character in data['characters']:
        chain=o.chain(character['clientId']);rows=[]
        for tid in chain:
            cfg=configs[str(tid)];effect=cfg.get('Effect',{});pairs=[]
            for i in range(1,len(effect),2):pairs.append({'property':attrcfg[str(effect[str(i)])]['Name'],'value':effect[str(i+1)]})
            rows.append({'id':tid,'potencyType':cfg.get('PotencyType'),'effectType':cfg.get('EffectType'),'effects':pairs})
        characters.append({'characterId':character['characterId'],'clientId':character['clientId'],'chain':rows})
        for target in [0,*chain]:fixtures.append({'characterId':character['characterId'],'targetPotencyId':target,'expected':o.attrs(character['clientId'],target)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':data['build'],'scope':'Original chain construction and GetPotencyAddAttrs over original config. Explicit Attr_Promote enum labels; owned-character lookup returns nil (unused in this method), localization identity. Only additional potency attributes; not level growth, full stats or gameplay.',
        'sourceHashes':{name:o.assets[name+'.lua']['sha256'] for name in ['AwakerDataUtils','AwakerPotency','ActorAttrType']},'characters':characters,'fixtures':fixtures}
    (ROOT/'tests/synthetic/original-potency-stats.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(fixtures),'original potency accumulation cases for',len(characters),'characters')
