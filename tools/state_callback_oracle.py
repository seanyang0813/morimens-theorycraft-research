"""Original State.Trigger cached-command branch, not command construction/execution."""
import ctypes as C
import json
from behit_hp_oracle import BeHitHpOracle, ROOT
class StateCallbackOracle(BeHitHpOracle):
    def __init__(self):
        super().__init__();L=self.state
        self.rawseti=self.lib.lua_rawseti;self.rawseti.argtypes=[C.c_void_p,C.c_int,C.c_longlong];self.rawseti.restype=None
        self.integer=self.lib.lua_pushinteger;self.integer.argtypes=[C.c_void_p,C.c_longlong];self.integer.restype=None
        def require(s):
            name=self.string(s,1,None)
            known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.DbgEngine.Cmd.BattleCmdServer':b'_oracle_cmd'}
            if name in known:self.getglobal(s,known[name])
            elif name in [b'Battle.Ecs.BattleEntity',b'Battle.DbgEngine.Card.BattleCardServer',b'Battle.DbgEngine.Cmd.BattleCmdParser',b'Battle.DbgEngine.Event.BattleLogicEvent',b'Battle.DbgEngine.DataCenter.BattleStateData']:self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('BattleStateServer');self.setglobal(L,b'_state_callback')
        if self.errors:raise RuntimeError(self.errors)
    def run_callback(self,v):
        L=self.state;self.top(L,0);self.trace=[]
        def noop(s):return 0
        self.table(L,0,9);self.number(L,88);self.setfield(L,-2,b'uid');self.boolean(L,v['deleted']);self.setfield(L,-2,b'isDeleted')
        self.table(L,0,3)
        def hidden(s):self.number(s,v['hidden']);return 1
        def card(s):self.boolean(s,v['card']);return 1
        def dead(s):self.boolean(s,v['dead']);return 1
        self.method('GetProperty',hidden);self.method('is',card);self.method('IsDead',dead);self.setfield(L,-2,b'owner')
        def ban(s):self.boolean(s,False);return 1
        def caster(s):self.number(s,7);return 1
        self.method('IsBan',ban);self.method('GetCasterUid',caster)
        self.table(L,0,4)
        if v['configured']:self.number(L,1);self.setfield(L,-2,b'TriggerCmd1')
        self.pushstring(L,b'StateOwner');self.setfield(L,-2,b'TriggerTarget1')
        if v['prohibitDead']:self.enum('StateDeathHandling','NonWipe_ProhibitTrigger');self.setfield(L,-2,b'DeathHandling')
        if v['judgment'] is not None:self.pushstring(L,b'probe');self.setfield(L,-2,b'Judgement1')
        self.setfield(L,-2,b'configData')
        self.table(L,0,3);self.table(L,0,1)
        def clear(s):self.trace.append('ClearMemberValues');return 0
        self.method('ClearMemberValues',clear);self.setfield(L,-2,b'cmdParser')
        def condition(s):
            self.trace.append('CheckCondition')
            if isinstance(v['judgment'],bool):self.boolean(s,v['judgment'])
            else:self.number(s,v['judgment'])
            return 1
        self.method('CheckCondition',condition);self.setfield(L,-2,b'triggerCmd1')
        self.table(L,0,7)
        for name in ['Warn','Error','Debug','LogBattleWithTab']:self.method(name,noop)
        def event(s):self.trace.append('StateTriggerEnd');return 0
        self.method('CreateEventEffect',event)
        self.table(L,0,1);self.table(L,0,1)
        if v['commandExists']:
            self.table(L,0,1);self.pushstring(L,b'probe');self.setfield(L,-2,b'CnID');self.rawseti(L,-2,1)
        self.setfield(L,-2,b'Cmd');self.setfield(L,-2,b'battleDT')
        self.table(L,0,1)
        def create(s):self.getfield(s,2,b'effectType');self.trace.append(self.string(s,-1,None).decode());return 0
        self.method('CreateEffect',create);self.setfield(L,-2,b'effectMgr');self.setfield(L,-2,b'battleEngine');self.setglobal(L,b'_state_self')
        self.getglobal(L,b'_state_callback');self.getfield(L,-1,b'Trigger');self.getglobal(L,b'_state_self');self.table(L,0,1);self.integer(L,1);self.setfield(L,-2,b'idx')
        self.table(L,0,1);self.boolean(L,v['ignoreDeleted']);self.setfield(L,-2,b'ignoreDeleted')
        self.check(self.call(L,3,0,0,0,None));return self.trace
if __name__=='__main__':
    o=StateCallbackOracle();base=dict(hidden=0,deleted=False,ignoreDeleted=False,card=False,dead=False,prohibitDead=False,configured=True,commandExists=True,judgment=None)
    changes=[{},dict(hidden=1),dict(deleted=True),dict(deleted=True,ignoreDeleted=True),dict(dead=True,prohibitDead=True),dict(dead=True,prohibitDead=True,card=True),dict(configured=False),dict(commandExists=False),dict(judgment=False),dict(judgment=0),dict(judgment=-1),dict(judgment=True)]
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original BattleStateServer.Trigger using a cached command. Explicit owner/death/caster adapters, IsBan false, no relic source, condition result supplied; parser clearing and effect/event requests observed. No new command constructor, command execution or gameplay validation.','sourceHash':o.assets['BattleStateServer.lua']['sha256'],'fixtures':[{'input':{**base,**c},'expected':o.run_callback({**base,**c})} for c in changes]}
    (ROOT/'tests/synthetic/original-state-callback.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Generated',len(changes),'original state callback cases')
