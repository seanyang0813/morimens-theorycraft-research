"""Execute original TriggerCmd through original GenerateEffectList with bounded adapters."""
import ctypes as C
import json

from target_runtime_oracle import TargetOracle, ROOT


class TriggerCmdOracle(TargetOracle):
    def __init__(self,asset_overrides=None):
        super().__init__(asset_overrides);L=self.state
        self.kind=self.lib.lua_type;self.kind.argtypes=[C.c_void_p,C.c_int];self.kind.restype=C.c_int
        self.tobool=self.lib.lua_toboolean;self.tobool.argtypes=[C.c_void_p,C.c_int];self.tobool.restype=C.c_int
        self.pushstring=self.lib.lua_pushstring;self.pushstring.argtypes=[C.c_void_p,C.c_char_p];self.pushstring.restype=C.c_char_p
        self.rawset=self.lib.lua_rawseti;self.rawset.argtypes=[C.c_void_p,C.c_int,C.c_longlong];self.rawset.restype=None
        self.rawget=self.lib.lua_rawgeti;self.rawget.argtypes=[C.c_void_p,C.c_int,C.c_longlong];self.rawget.restype=C.c_int
        self.length=self.lib.lua_rawlen;self.length.argtypes=[C.c_void_p,C.c_int];self.length.restype=C.c_size_t

    def array(self,s,values,writer):
        self.table(s,len(values),0)
        for index,value in enumerate(values,1):writer(s,value);self.rawset(s,-2,index)

    def prepare(self,v):
        L=self.state;self.top(L,0);self.trace=[];self.pre=[]
        self.table(L,0,16)
        for name in ('TriggerCmd','GenerateEffectList'):
            self.getglobal(L,b'_oracle_cmd');self.getfield(L,-1,name.encode());self.setfield(L,-3,name.encode());self.top(L,-2)
        self.boolean(L,v['isPreCmd']);self.setfield(L,-2,b'isPreCmd')
        self.number(L,100);self.setfield(L,-2,b'cmdId');self.number(L,200);self.setfield(L,-2,b'skillConfigId')
        if v['statePresent']:self.number(L,300);self.setfield(L,-2,b'stateId')
        self.table(L,1,0);self.table(L,0,1);self.number(L,-1);self.setfield(L,-2,b'id');self.rawset(L,-2,1);self.setfield(L,-2,b'effectList')
        def skill_type(s):self.trace.append('GetSkillTypeStr');self.pushstring(s,b'TypeName');return 1
        def loop(s):self.trace.append('CheckLoopCall');self.boolean(s,False);return 1
        def skill_args(s):self.trace.append('GetSkillArgs');self.array(s,[11,22],lambda state,value:self.number(state,value));self.table(s,0,0);return 2
        def delays(s):
            self.trace.append('GetEffectDelayTimes');self.array(s,[.25,.75],lambda state,value:self.number(state,value));return 1
        def make_effect(s):
            self.getfield(s,2,b'id');row_id=self.tonumber(s,-1,None);self.top(s,-2)
            item={'rowId':row_id,'delay':self.tonumber(s,3,None),'skipPhase':bool(self.tobool(s,4)),'index':self.tonumber(s,5,None)};self.trace.append(['GenerateEffectObj',item])
            self.table(s,0,1)
            effect_index=int(self.tonumber(s,5,None))
            def pretrigger(state,index=effect_index):
                self.getfield(state,2,b'_probe');kind=self.kind(state,-1);seen=self.tonumber(state,-1,None) if kind==3 else None;self.top(state,-2)
                self.getfield(state,2,b'token');kind=self.kind(state,-1);token=self.tonumber(state,-1,None) if kind==3 else None;self.top(state,-2)
                self.pre.append({'effect':index,'seenProbe':seen,'token':token});self.number(state,99);self.setfield(state,2,b'_probe');return 0
            self.method('PreTrigger',pretrigger);return 1
        for name,fn in [('GetSkillTypeStr',skill_type),('CheckLoopCall',loop),('GetSkillArgs',skill_args),('GetEffectDelayTimes',delays),('GenerateEffectObj',make_effect)]:self.method(name,fn)
        self.table(L,0,1)
        def update(s):
            self.trace.append(['UpdateSkillArgs',self.length(s,2)]);return 0
        self.method('UpdateSkillArgs',update);self.setfield(L,-2,b'cmdParser')
        self.setglobal(L,b'_trigger_self')
        self.table(L,0,5)
        self.table(L,0,1)
        def increase(s):self.trace.append('IncreaseActionIndex');return 0
        self.method('IncreaseActionIndex',increase);self.setfield(L,-2,b'boutMgr');self.setglobal(L,b'_trigger_engine')
        self.table(L,0,3)
        self.table(L,0,1);self.table(L,0,2);self.pushstring(L,b'CommandName');self.setfield(L,-2,b'CnID')
        self.table(L,len(v['rows']),0)
        for index,row_id in enumerate(v['rows'],1):self.table(L,0,1);self.number(L,row_id);self.setfield(L,-2,b'id');self.rawset(L,-2,index)
        self.setfield(L,-2,b'data_list');self.rawset(L,-2,100);self.setfield(L,-2,b'Cmd')
        self.table(L,0,1)
        if v['skillPresent']:
            self.table(L,0,2);self.pushstring(L,b'SkillName');self.setfield(L,-2,b'CnID')
            if v['perform']!='absent':
                self.table(L,1 if v['perform']=='nonempty' else 0,0)
                if v['perform']=='nonempty':self.number(L,1);self.rawset(L,-2,1)
                self.setfield(L,-2,b'NotAwakerCardPerform')
            self.rawset(L,-2,200)
        self.setfield(L,-2,b'Skill')
        self.table(L,0,1)
        if v['statePresent']:self.table(L,0,1);self.pushstring(L,b'StateName');self.setfield(L,-2,b'CnID');self.rawset(L,-2,300)
        self.setfield(L,-2,b'State');self.setglobal(L,b'_trigger_dt')
        def info(s):
            value=self.string(s,2,None).decode('utf-8','replace');self.trace.append(['Info',{'command':'CommandName' in value,'skill':'SkillName' in value,'state':'StateName' in value,'type':'TypeName' in value}]);return 0
        self.getglobal(L,b'_trigger_engine');self.getglobal(L,b'_trigger_dt');self.setfield(L,-2,b'battleDT');self.method('Info',info);self.setglobal(L,b'_trigger_engine')
        self.getglobal(L,b'_trigger_self');self.getglobal(L,b'_trigger_engine');self.setfield(L,-2,b'battleEngine');self.top(L,0)

    def call_trigger(self,v):
        L=self.state;self.top(L,0)
        self.getglobal(L,b'_trigger_self');self.getfield(L,-1,b'TriggerCmd');self.getglobal(L,b'_trigger_self')
        if v['triggerPresent']:
            self.table(L,0,1);self.number(L,7);self.setfield(L,-2,b'token')
        else:self.nil(L)
        self.boolean(L,v['skipPhase']);self.check(self.call(L,3,0,0,0,None));self.top(L,0)

    def result(self):
        L=self.state;self.top(L,0)
        self.getglobal(L,b'_trigger_self');self.getfield(L,-1,b'effectList');effect_count=self.length(L,-1);self.top(L,-2)
        self.getfield(L,-1,b'triggerData');self.getfield(L,-1,b'_probe');probe=self.tonumber(L,-1,None) if self.kind(L,-1)==3 else None;self.top(L,0)
        if self.errors:raise RuntimeError(self.errors)
        return {'trace':self.trace,'preTriggers':self.pre,'effectCount':effect_count,'triggerProbe':probe}

    def run(self,v):
        self.prepare(v);self.call_trigger(v);return self.result()


CASES=[
 {'name':'ordinary','isPreCmd':False,'triggerPresent':True,'skipPhase':False,'skillPresent':True,'statePresent':False,'perform':'absent','rows':[1,2]},
 {'name':'pre-command','isPreCmd':True,'triggerPresent':True,'skipPhase':False,'skillPresent':True,'statePresent':False,'perform':'absent','rows':[1]},
 {'name':'skip-no-perform','isPreCmd':False,'triggerPresent':False,'skipPhase':True,'skillPresent':True,'statePresent':False,'perform':'empty','rows':[1,2]},
 {'name':'skip-with-perform','isPreCmd':False,'triggerPresent':True,'skipPhase':True,'skillPresent':True,'statePresent':True,'perform':'nonempty','rows':[1,2]},
 {'name':'state-only-empty','isPreCmd':False,'triggerPresent':False,'skipPhase':False,'skillPresent':False,'statePresent':True,'perform':'absent','rows':[]},
]


def main():
    oracle=TriggerCmdOracle();fixtures=[{'input':row,'expected':oracle.run(row)} for row in CASES]
    output=ROOT/'tests/synthetic/original-trigger-cmd.json'
    output.write_text(json.dumps({'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHash':oracle.assets['BattleCmdServer.lua']['sha256'],'scope':'Original TriggerCmd through original GenerateEffectList with explicit command data and bounded action-index, logging, argument, delay and effect-construction adapters. PreTrigger calls and trigger-data reuse observed. No real effect construction/execution, target generation, events, gameplay or holdout.','fixtures':fixtures},indent=2)+'\n',encoding='utf-8',newline='\n');print('Generated',len(fixtures),'original TriggerCmd cases')


if __name__=='__main__':main()
