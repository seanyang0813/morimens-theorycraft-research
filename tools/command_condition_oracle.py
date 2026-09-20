"""Original command conditions, including observable short-circuit state reads."""
import ctypes as C
import json
from runtime_oracle import Oracle, ROOT

o=Oracle();L=o.state;o.module('FuncTable');o.setglobal(L,b'_condition_functions')
kind=o.lib.lua_type;kind.argtypes=[C.c_void_p,C.c_int];kind.restype=C.c_int
boolean=o.lib.lua_toboolean;boolean.argtypes=[C.c_void_p,C.c_int];boolean.restype=C.c_int
commands=json.loads((ROOT/'research/extracted/config/Cmd.json').read_text(encoding='utf-8'))
expressions=sorted({row['Cond'] for cid in ['80572','81060','117337'] for row in commands[cid]['data_list'].values() if 'Cond' in row})
callbacks=[];fixtures=[];errors=[]
def getter(name):
    @C.CFUNCTYPE(C.c_int,C.c_void_p)
    def query(s):
        try:
            key=int(o.tonumber(s,1,None));value=layers[key]
            calls.append({'name':name+'.GetStateLayer','args':[key],'value':value});o.number(s,value)
        except Exception as error:errors.append(str(error));o.number(s,0)
        return 1
    callbacks.append(query);return query
getters={name:getter(name) for name in ['UpperTarget','CmdCaster']}
for expression in expressions:
    for marker in [0,1]:
        for blocker in [0,1]:
            for argument in [0,2.5,100]:
                layers={80575:3,80593:marker,80594:1-marker,66314:blocker,62317:0,117365:marker};calls=[];errors.clear()
                o.top(L,0);o.getglobal(L,b'_condition_functions');o.getfield(L,-1,expression.encode())
                if kind(L,-1)!=6:raise RuntimeError('Missing original condition')
                o.table(L,0,3);o.number(L,argument);o.setfield(L,-2,b'Arg1')
                for name,query in getters.items():
                    o.table(L,0,1);o.pushclosure(L,query,0);o.setfield(L,-2,b'GetStateLayer');o.setfield(L,-2,name.encode())
                o.check(o.call(L,1,1,0,0,None))
                if errors:raise RuntimeError(errors)
                if kind(L,-1)!=1:raise RuntimeError('Expected original boolean condition')
                fixtures.append({'input':{'expression':expression,'argument':argument,'layers':layers},'expected':{'passed':bool(boolean(L,-1)),'calls':calls}})
out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{name:o.assets[name+'.lua']['sha256'] for name in ['FuncTable','Cmd']},'scope':'Original compiled conditions from commands 80572,81060,117337; supplied state-query adapters with observed call order. No original parser, CheckCondition gate, state implementation, row execution or gameplay.','fixtures':fixtures}
(ROOT/'tests/synthetic/original-command-conditions.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print('Generated',len(fixtures),'original condition cases across',len(expressions),'expressions')
