"""Probe original presentation method for shared RNG calls; no visual output."""
import ctypes as C
import json
from passive_runtime_oracle import PassiveOracle, ROOT
class VfxOracle(PassiveOracle):
    def run(self,groups,vfx):
        L=self.state;self.top(L,0);events=[]
        rawget=self.lib.lua_rawgeti;rawget.argtypes=[C.c_void_p,C.c_int,C.c_longlong]
        self.getglobal(L,b'_passive_base');self.getfield(L,-1,b'PlayEffectSfx');self.table(L,0,4)
        self.table(L,0,1)
        if vfx:
            self.table(L,1,0);self.number(L,999);self.rawseti(L,-2,1);self.setfield(L,-2,b'VFX')
        self.setfield(L,-2,b'cmdCfg')
        self.table(L,0,1);self.number(L,123);self.setfield(L,-2,b'cmdId');self.setfield(L,-2,b'cmdServer')
        self.table(L,len(groups),0)
        for i,group in enumerate(groups,1):
            self.table(L,0,3)
            def player(s):self.boolean(s,True);return 1
            self.method('IsRoleType',player)
            def awakener_list(s,group=group):
                self.table(s,len(group),0)
                for j,uid in enumerate(group,1):
                    self.table(s,0,1);self.number(s,uid);self.setfield(s,-2,b'uid');self.rawseti(s,-2,j)
                return 1
            self.method('GetAwakerList',awakener_list);self.rawseti(L,-2,i)
        self.setfield(L,-2,b'targets')
        self.table(L,0,2);self.table(L,0,1)
        def random(s):
            low=self.tonumber(s,2,None);high=self.tonumber(s,3,None);events.append({'type':'random','low':low,'high':high});self.number(s,high);return 1
        self.method('random',random);self.setfield(L,-2,b'rand')
        self.table(L,0,1)
        def record(s):
            ids=[]
            for i in range(1,len(groups)+1):
                rawget(s,3,i)
                value=self.tonumber(s,-1,None);self.top(s,-2)
                if value:ids.append(value)
            events.append({'type':'record','targetUids':ids});return 0
        self.method('OnPlayEffectSfx',record);self.setfield(L,-2,b'recordMgr');self.setfield(L,-2,b'battleEngine')
        self.check(self.call(L,1,0,0,0,None))
        if self.errors:raise RuntimeError(self.errors)
        return events
if __name__=='__main__':
    o=VfxOracle();fixtures=[]
    for groups in [[],[[]],[[11]],[[11,12,13]],[[11,12],[],[21,22,23]]]:
        for vfx in [False,True]:
            actual=o.run(groups,vfx)
            expected=[]
            if vfx and groups:
                expected=[{'type':'random','low':1,'high':len(g)} for g in groups if g]
                expected.append({'type':'record','targetUids':[g[-1] for g in groups if g]})
            assert actual==expected,(groups,vfx,actual,expected)
            fixtures.append({'input':{'playerAwakenerGroups':groups,'vfxPresent':vfx},'events':actual})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{'BattleEffectServer':o.assets['BattleEffectServer.lua']['sha256']},'scope':'10 original PlayEffectSfx executions with player targets, supplied Awakener lists, shared rand callback choosing last index, and record observer. No actual PRNG algorithm/state or downstream gameplay.','fixtures':fixtures}
    (ROOT/'research/evidence/effect-vfx-rng.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Verified',len(fixtures),'original VFX RNG probes')
