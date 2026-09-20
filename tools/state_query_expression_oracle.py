"""Original skill expression with live GetStateLayer queries; no state implementation."""
import ctypes as C
import json
from runtime_oracle import Oracle, ROOT

o=Oracle();L=o.state;o.module('FuncTable');o.setglobal(L,b'_state_query_functions')
kind=o.lib.lua_type;kind.argtypes=[C.c_void_p,C.c_int];kind.restype=C.c_int
expression='BattleAtkForce*GrowArgValue1*(1+CmdCaster.GetStateLayer(45713)/100)*(1+CmdCaster.GetStateLayer(119813)/100),3'
fixtures=[]
errors=[]
@C.CFUNCTYPE(C.c_int,C.c_void_p)
def layer(s):
    try:
        key=int(o.tonumber(s,1,None));value=layers[key]
        calls.append({'name':'CmdCaster.GetStateLayer','args':[key],'value':value});o.number(s,value)
    except Exception as error:errors.append(str(error));o.number(s,0)
    return 1

for attack in [0,138,258,300.25]:
    for first,second in [(0,0),(1,25),(100,50),(2.5,-20)]:
        layers={45713:first,119813:second};calls=[];errors.clear()
        o.top(L,0);o.getglobal(L,b'_state_query_functions');o.getfield(L,-1,expression.encode())
        if kind(L,-1)!=6:raise RuntimeError('Original expression missing')
        o.table(L,0,3);o.number(L,attack);o.setfield(L,-2,b'BattleAtkForce');o.number(L,.78);o.setfield(L,-2,b'GrowArgValue1')
        o.table(L,0,1);o.pushclosure(L,layer,0);o.setfield(L,-2,b'GetStateLayer');o.setfield(L,-2,b'CmdCaster')
        o.check(o.call(L,1,2,0,0,None))
        if errors:raise RuntimeError(errors)
        if kind(L,-2)!=3 or kind(L,-1)!=3:raise RuntimeError('Unexpected output types')
        fixtures.append({'input':{'expression':expression,'variables':{'BattleAtkForce':attack,'GrowArgValue1':.78},'layers':layers},'expected':{'values':[o.tonumber(L,-2,None),o.tonumber(L,-1,None)],'calls':calls}})
out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{'FuncTable':o.assets['FuncTable.lua']['sha256']},'scope':'16 original compiled skill-expression executions, explicit attack/coefficient and numeric state-query adapter. No original parser, state lookup, skill selection, command execution or gameplay.','fixtures':fixtures}
(ROOT/'tests/synthetic/original-state-query-expressions.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print('Generated',len(fixtures),'original state-query expression cases')
