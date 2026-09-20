"""Original fatal-damage body with synchronous event adapters and explicit role responses."""
import ctypes as C
import json
from target_runtime_oracle import TargetOracle, ROOT

class DeadlyDamageOracle(TargetOracle):
    def __init__(self):
        super().__init__();L=self.state
        self.pushstring=self.lib.lua_pushstring;self.pushstring.argtypes=[C.c_void_p,C.c_char_p]
        self.tobool=self.lib.lua_toboolean;self.tobool.argtypes=[C.c_void_p,C.c_int];self.tobool.restype=C.c_int
        def noop(s):return 0
        self.table(L,0,1);self.method('DoEffect',noop);self.setglobal(L,b'_deadly_super')
        self.getglobal(L,b'_oracle_config_system')
        def newclass(s):self.table(s,0,10);self.getglobal(s,b'_deadly_super');return 2
        self.method('NewClass',newclass);self.top(L,0)
        known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.DbgEngine.Effect.BattleEffectServer':b'_deadly_super',b'Battle.DbgEngine.Event.BattleLogicEvent':b'_deadly_events'}
        def require(s):
            name=self.string(s,1,None)
            if name in known:self.getglobal(s,known[name])
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require')
        self.module('BattleLogicEvent');self.setglobal(L,b'_deadly_events')
        self.eventNames={}
        for name in ['RoleBeforeDeathResist','RoleAfterDeathResist','RoleBeforeDeath','RoleAfterDeath']:
            self.getglobal(L,b'_deadly_events');self.getfield(L,-1,name.encode());self.eventNames[self.tonumber(L,-1,None)]=name;self.top(L,0)
        self.module('BERoleDeadlyDamage');self.setglobal(L,b'_deadly_effect')
        # These two functions feed diagnostic logging only; no model state mutation.
        self.getglobal(L,b'table')
        def clone(s):self.pushvalue(s,1);return 1
        def tostring(s):self.pushstring(s,b'diagnostic');return 1
        self.method('deepclone',clone);self.method('tostring',tostring);self.top(L,0)
        self.table(L,0,4);self.number(L,7);self.setfield(L,-2,b'uid')
        def prop(s):
            key=self.string(s,2,None)
            self.number(s,self.hp if key==b'hp' else self.case['revivePopup'] if key==b'rivive_popup' else 0);return 1
        def resist(s):self.boolean(s,self.case['deathResist']);return 1
        def apply(s):self.trace.append('DeathResist');self.hp=self.case['hpAfterDeathResist'];return 0
        self.method('GetProperty',prop);self.method('IsDeathResist',resist);self.method('DeathResist',apply);self.setglobal(L,b'_deadly_role')
        self.table(L,0,4)
        def role(s):
            if self.case['roleExists']:self.getglobal(s,b'_deadly_role')
            else:self.nil(s)
            return 1
        def event(s):
            name=self.eventNames[self.tonumber(s,2,None)];self.trace.append(name)
            if name=='RoleBeforeDeathResist' and self.case['healBeforeResist'] is not None:self.hp=self.case['healBeforeResist']
            if name=='RoleBeforeDeath' and self.case['healBeforeDeath'] is not None:self.hp=self.case['healBeforeDeath']
            return 0
        def floating(s):self.trace.append('ReviveFloatingText');return 0
        self.method('GetObj',role);self.method('CreateEventEffect',event);self.method('Debug',noop)
        self.table(L,0,1);self.method('OnFloatingText',floating);self.setfield(L,-2,b'recordMgr');self.setglobal(L,b'_deadly_engine')
        self.getglobal(L,b'_deadly_effect');self.getglobal(L,b'_deadly_engine');self.setfield(L,-2,b'battleEngine')
        self.table(L,0,1);self.number(L,7);self.setfield(L,-2,b'roleUid');self.setfield(L,-2,b'effectConfig');self.top(L,0)
        if self.errors:raise RuntimeError(self.errors)

    def evaluate(self,case):
        self.case=case;self.hp=case['hp'];self.trace=[];L=self.state;self.top(L,0)
        self.getglobal(L,b'_deadly_effect');self.getfield(L,-1,b'DoEffect');self.getglobal(L,b'_deadly_effect');self.check(self.call(L,1,1,0,0,None))
        return dict(returnValue=bool(self.tobool(L,-1)),hp=self.hp,trace=self.trace)

if __name__=='__main__':
    o=DeadlyDamageOracle()
    base=dict(roleExists=True,hp=0,deathResist=False,hpAfterDeathResist=1,healBeforeResist=None,healBeforeDeath=None,revivePopup=0)
    changes=[{},dict(roleExists=False),dict(healBeforeResist=25),dict(deathResist=True),dict(healBeforeDeath=30),dict(healBeforeDeath=30,revivePopup=1),dict(hp=10),dict(deathResist=True,healBeforeResist=25)]
    out={'scope':'Original BERoleDeadlyDamage.DoEffect; base DoEffect and logging stubbed. Event adapter executes configured HP responses synchronously; IsDeathResist/DeathResist are explicit role adapters, not full implementations. Does not execute scheduler override, actual revive states or BERoleDie.','sourceHash':o.assets['BERoleDeadlyDamage.lua']['sha256'],'fixtures':[{'input':{**base,**change},'expected':o.evaluate({**base,**change})} for change in changes]}
    (ROOT/'tests/synthetic/original-deadly-damage.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(changes),'original fatal-damage control-flow cases')
