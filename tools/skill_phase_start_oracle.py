"""Original phase DoEffect with observed command hooks, no command execution."""
import itertools
import json
from skill_phase_finish_oracle import PhaseFinishOracle, ROOT
class PhaseStartOracle(PhaseFinishOracle):
    def run_start(self,v):
        L=self.state;self.top(L,0);self.trace=[]
        self.table(L,0,8);self.number(L,1);self.setfield(L,-2,b'cmdId')
        def deleted(s):self.trace.append(['SetIsDeleted',bool(self.tobool(s,2))]);return 0
        def targets(s):self.trace.append(['GetUpperTargets']);self.getglobal(s,b'_start_targets');return 1
        def timing(s):self.trace.append(['GetSkillCastTime']);return 0
        def before(s):
            self.getfield(s,2,b'token');self.trace.append(['OnEnterBeforePhase',self.tonumber(s,-1,None)]);return 0
        def timeline(s):self.trace.append(['SendNotAwakerTimeline',bool(self.tobool(s,2))]);return 0
        def trigger(s):
            self.getfield(s,2,b'token');self.trace.append(['TriggerCmd',self.tonumber(s,-1,None),bool(self.tobool(s,3))]);return 0
        for name,fn in [('SetIsDeleted',deleted),('GetUpperTargets',targets),('GetSkillCastTime',timing),('OnEnterBeforePhase',before),('SendNotAwakerTimeline',timeline),('TriggerCmd',trigger)]:self.method(name,fn)
        self.setglobal(L,b'_start_cmd')
        self.table(L,0,1);self.number(L,7);self.setfield(L,-2,b'token');self.setglobal(L,b'_start_targets')
        self.table(L,0,3)
        self.table(L,0,4);self.getglobal(L,b'_start_cmd');self.setfield(L,-2,b'cmdServer')
        for key in ['skipPhase','skipTimeline']:self.boolean(L,v[key]);self.setfield(L,-2,key.encode())
        self.table(L,0,1);self.number(L,42);self.setfield(L,-2,b'token');self.setfield(L,-2,b'triggerData');self.setfield(L,-2,b'effectConfig')
        def after(s):self.trace.append(['AfterCreateSkillPhase']);return 0
        self.method('__FireAfterCreateSkillPhase',after)
        self.table(L,0,3)
        def time(s):self.trace.append(['GetCurPassTime']);self.number(s,10);return 1
        def log(s):return 0
        self.method('GetCurPassTime',time);self.method('LogBattleWithTab',log)
        self.table(L,0,2);self.table(L,0,0);self.setfield(L,-2,b'State')
        self.table(L,0,1);self.table(L,0,1);self.pushstring(L,b'Synthetic command');self.setfield(L,-2,b'CnID')
        # Numeric Cmd[1] without relying on Python-side Lua table serialization.
        import ctypes as C
        rawseti=self.lib.lua_rawseti;rawseti.argtypes=[C.c_void_p,C.c_int,C.c_longlong];rawseti.restype=None
        rawseti(L,-2,1);self.setfield(L,-2,b'Cmd');self.setfield(L,-2,b'battleDT');self.setfield(L,-2,b'battleEngine')
        self.setglobal(L,b'_start_self')
        self.getglobal(L,b'_phase_original');self.getfield(L,-1,b'DoEffect');self.getglobal(L,b'_start_self');self.check(self.call(L,1,1,0,0,None))
        return {'returned':bool(self.tobool(L,-1)),'trace':self.trace}
if __name__=='__main__':
    o=PhaseStartOracle();cases=[dict(skipPhase=p,skipTimeline=t) for p,t in itertools.product([False,True],repeat=2)]
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original phase DoEffect; base DoEffect no-op, command hooks and after-create hook observed, logging stubbed. Target/trigger payload tokens check forwarding; no commands, events or scheduler execution.','sourceHash':o.assets['BECreateSkillPhase.lua']['sha256'],'fixtures':[{'input':v,'expected':o.run_start(v)} for v in cases]}
    (ROOT/'tests/synthetic/original-skill-phase-start.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(cases),'original phase start cases')
