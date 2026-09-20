"""Original GetSkillArgs numeric argument normalization, no description branch."""
import json
import ctypes as C
from offensive_setup_oracle import SetupOracle, ROOT
o=SetupOracle();L=o.state
o.rawgeti=o.lib.lua_rawgeti;o.rawgeti.argtypes=[C.c_void_p,C.c_int,C.c_longlong];o.rawgeti.restype=C.c_int
o.getglobal(L,b'_setup_self')
def args(s):
    o.table(s,len(o.values['raw']),0)
    for i,v in enumerate(o.values['raw'],1):o.number(s,v);o.rawseti(s,-2,i)
    return 1
o.method('__CalcBaseSkillArgs',args);o.top(L,0)
cases=[]
for raw in [[49.5,2],[59.4,3],[27.6,1],[-1.2,0,1.00000001],[0,100,250],[412.5,495]]:
    for override in [[],[0],[0.5],[123.25,4.5]]:
        o.values={'raw':raw,'override':override};o.getglobal(L,b'_setup_self');o.table(L,len(override),0)
        for i,v in enumerate(override,1):o.number(L,v);o.rawseti(L,-2,i)
        o.setfield(L,-2,b'createCardArgs');o.top(L,0)
        o.getglobal(L,b'_oracle_cmd');o.getfield(L,-1,b'GetSkillArgs');o.getglobal(L,b'_setup_self');o.check(o.call(L,1,2,0,0,None))
        result=[]
        for i in range(1,max(len(raw),len(override))+1):o.rawgeti(L,-2,i);result.append(o.tonumber(L,-1,None));o.top(L,-2)
        cases.append({'input':o.values.copy(),'expected':result});o.top(L,0)
out={'scope':'Original GetSkillArgs with controlled numeric __CalcBaseSkillArgs output and no skillConfigId/description; dense createCardArgs prefix only; no expression evaluation or scheduler','sourceHash':o.assets['BattleCmdServer.lua']['sha256'],'fixtures':cases}
(ROOT/'tests/synthetic/original-skill-arguments.json').write_text(json.dumps(out,indent=2),encoding='utf-8');print('Generated',len(cases),'argument normalization cases')
