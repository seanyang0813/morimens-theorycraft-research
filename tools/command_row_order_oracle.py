"""Probe original GenerateEffectList row order and skip-phase delay override."""
import ctypes as C
import itertools,json
from target_runtime_oracle import TargetOracle,ROOT
class RowOracle(TargetOracle):
    def __init__(self,asset_overrides=None):super().__init__(asset_overrides)
    def run(self,skip,perform):
        L=self.state;self.top(L,0);events=[]
        raw=self.lib.lua_rawseti;raw.argtypes=[C.c_void_p,C.c_int,C.c_longlong]
        self.getglobal(L,b'_oracle_cmd');self.getfield(L,-1,b'GenerateEffectList');self.table(L,0,8)
        for name,value in [('cmdId',1),('skillConfigId',1)]:self.number(L,value);self.setfield(L,-2,name.encode())
        def check(s):self.boolean(s,False);return 1
        self.method('CheckLoopCall',check)
        def args(s):self.table(s,0,0);return 1
        self.method('GetSkillArgs',args)
        self.table(L,0,1)
        def update(s):return 0
        self.method('UpdateSkillArgs',update);self.setfield(L,-2,b'cmdParser')
        def delays(s):
            self.table(s,3,0)
            for i in range(1,4):self.number(s,i/10);raw(s,-2,i)
            return 1
        self.method('GetEffectDelayTimes',delays)
        def effect(s):
            self.getfield(s,2,b'BaseSortID');sort=self.tonumber(s,-1,None);self.top(s,-2)
            events.append({'index':self.tonumber(s,5,None),'baseSortId':sort,'delay':self.tonumber(s,3,None)})
            self.table(s,0,0);return 1
        self.method('GenerateEffectObj',effect)
        self.table(L,0,1);self.table(L,0,2);self.table(L,1,0);self.table(L,0,1);self.table(L,3,0)
        for i,sort in enumerate([300,100,200],1):self.table(L,0,1);self.number(L,sort);self.setfield(L,-2,b'BaseSortID');raw(L,-2,i)
        self.setfield(L,-2,b'data_list');raw(L,-2,1);self.setfield(L,-2,b'Cmd')
        self.table(L,1,0);self.table(L,0,1)
        if perform!='absent':
            self.table(L,1,0)
            if perform=='nonempty':self.number(L,1);raw(L,-2,1)
            self.setfield(L,-2,b'NotAwakerCardPerform')
        raw(L,-2,1);self.setfield(L,-2,b'Skill');self.setfield(L,-2,b'battleDT');self.setfield(L,-2,b'battleEngine')
        self.nil(L);self.boolean(L,skip);self.check(self.call(L,3,1,0,0,None))
        if self.errors:raise RuntimeError(self.errors)
        return events
if __name__=='__main__':
    o=RowOracle();fixtures=[]
    for skip,perform in itertools.product([False,True],['absent','empty','nonempty']):
        result=o.run(skip,perform)
        expected=[{'index':i,'baseSortId':sort,'delay':0 if skip and perform!='nonempty' else i/10} for i,sort in enumerate([300,100,200],1)]
        assert result==expected,(result,expected)
        fixtures.append({'skipPhase':skip,'notAwakerCardPerform':perform,'effects':result})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{'BattleCmdServer':o.assets['BattleCmdServer.lua']['sha256']},'scope':'6 original GenerateEffectList cases with contiguous three-row config, explicit delay adapter, no-loop and skill-argument/parser adapters, effect-construction observer. No actual effect construction or gameplay.','fixtures':fixtures}
    (ROOT/'research/evidence/command-row-order.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Verified 6 original row-order and skip-phase cases')
