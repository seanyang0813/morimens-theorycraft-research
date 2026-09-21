"""Execute original command delay planning with supplied cast-time results."""
import ctypes as C
import itertools
import json
from target_runtime_oracle import TargetOracle, ROOT
class DelayOracle(TargetOracle):
    def __init__(self,asset_overrides=None):super().__init__(asset_overrides)
    def run(self,v):
        L=self.state;self.top(L,0);reads=[]
        push=self.lib.lua_pushstring;push.argtypes=[C.c_void_p,C.c_char_p];push.restype=C.c_char_p
        rawset=self.lib.lua_rawseti;rawset.argtypes=[C.c_void_p,C.c_int,C.c_longlong]
        rawget=self.lib.lua_rawgeti;rawget.argtypes=[C.c_void_p,C.c_int,C.c_longlong]
        self.getglobal(L,b'_oracle_cmd');self.getfield(L,-1,b'GetEffectDelayTimes')
        self.table(L,0,2);self.boolean(L,v['preCommand']);self.setfield(L,-2,b'isPreCmd')
        def cast(s):
            name=self.string(s,2,None).decode();reads.append(name)
            result=v['castTimes'][name]
            if result is None:self.nil(s)
            else:self.number(s,result)
            return 1
        self.method('GetSkillCastTime',cast)
        self.table(L,len(v['delays']),0)
        for i,d in enumerate(v['delays'],1):
            self.table(L,0,1)
            if d is not None:
                if isinstance(d,str):push(L,d.encode())
                elif isinstance(d,bool):self.boolean(L,d)
                else:self.number(L,d)
                self.setfield(L,-2,b'DelayTime')
            rawset(L,-2,i)
        if v['executeCommand']:self.number(L,123)
        else:self.nil(L)
        self.check(self.call(L,3,1,0,0,None));values=[]
        for i in range(1,len(v['delays'])+1):
            rawget(L,-1,i);values.append(self.tonumber(L,-1,None));self.top(L,-2)
        if self.errors:raise RuntimeError(self.errors)
        return {'delays':values,'castTimeReads':reads}
if __name__=='__main__':
    o=DelayOracle();fixtures=[]
    sequences=[[],[None],[None,None],[100,None,100],[0,None,0],['cast','cast2',100],['cast',-100,None],['100',' 2.5e2 ','cast2'],[False,False],['cast2',None,'cast'],['unknown',None],['cast',1000,'cast2',200]]
    for delays,pre,execute,times in itertools.product(sequences,[False,True],[False,True],[{'cast':1,'cast2':0.25,'unknown':None},{'cast':0,'cast2':2,'unknown':None}]):
        v={'delays':delays,'preCommand':pre,'executeCommand':execute,'castTimes':times};fixtures.append({'input':v,'expected':o.run(v)})
    result={'build':'pc-res144-build51','kind':'SYNTHETIC_ORIGINAL_RUNTIME','sourceHashes':{'BattleCmdServer':o.assets['BattleCmdServer.lua']['sha256']},'scope':'96 original GetEffectDelayTimes executions; supplied cast-time callback results and pre/nested command flags. No animation lookup, effect generation, scheduler or gameplay.','fixtures':fixtures}
    (ROOT/'tests/synthetic/original-command-delays.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');print('Generated',len(fixtures),'original delay cases')
