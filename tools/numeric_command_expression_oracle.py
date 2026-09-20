"""Original compiled numeric expressions using explicit nested numeric environments."""
import ctypes as C
import json
from runtime_oracle import Oracle, ROOT

o=Oracle();L=o.state;o.module('FuncTable');o.setglobal(L,b'_numeric_functions')
kind=o.lib.lua_type;kind.argtypes=[C.c_void_p,C.c_int];kind.restype=C.c_int
gettop=o.lib.lua_gettop;gettop.argtypes=[C.c_void_p];gettop.restype=C.c_int

def table(values):
    o.table(L,0,len(values))
    for key,value in values.items():
        if isinstance(value,dict):table(value)
        else:o.number(L,value)
        o.setfield(L,-2,key.encode())

expressions=['Arg1','Arg1,Arg2','Arg1,1,0,ParaPlus1','UpperTarget.physique*4*1.5','CmdCaster.max_hp','BattleAtkForce*GrowArgValue1']
fixtures=[]
for expression in expressions:
    for scalar in [-2.5,0,1.25,258]:
        environment={'Arg1':scalar,'Arg2':3.5,'ParaPlus1':7.25,'UpperTarget':{'physique':scalar},'CmdCaster':{'max_hp':scalar},'BattleAtkForce':scalar,'GrowArgValue1':.78}
        o.top(L,0);o.getglobal(L,b'_numeric_functions');o.getfield(L,-1,expression.encode())
        if kind(L,-1)!=6:raise RuntimeError('Missing compiled expression: '+expression)
        table(environment);o.check(o.call(L,1,-1,0,0,None))
        expected=[]
        for index in range(2,gettop(L)+1):
            if kind(L,index)!=3:raise RuntimeError('Nonnumeric original result')
            expected.append(o.tonumber(L,index,None))
        fixtures.append({'input':{'expression':expression,'environment':environment},'expected':expected})
out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{'FuncTable':o.assets['FuncTable.lua']['sha256']},'scope':'Six original compiled expression closures with explicit numeric environments, four values each. No original parser/environment lookup, argument fallback, card, target selection or gameplay.','fixtures':fixtures}
(ROOT/'tests/synthetic/original-numeric-command-expressions.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print('Generated',len(fixtures),'original numeric expression cases')
