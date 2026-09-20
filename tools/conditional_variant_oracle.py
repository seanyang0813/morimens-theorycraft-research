"""Original conditional-list selection with observable supplied expression results."""
import ctypes as C
import json
from target_runtime_oracle import TargetOracle, ROOT

o=TargetOracle();L=o.state
rawseti=o.lib.lua_rawseti;rawseti.argtypes=[C.c_void_p,C.c_int,C.c_longlong];rawseti.restype=None
pushstring=o.lib.lua_pushstring;pushstring.argtypes=[C.c_void_p,C.c_char_p];pushstring.restype=C.c_char_p
kind=o.lib.lua_type;kind.argtypes=[C.c_void_p,C.c_int];kind.restype=C.c_int
def push(value):
    if value is None:o.nil(L)
    elif isinstance(value,bool):o.boolean(L,value)
    elif isinstance(value,str):pushstring(L,value.encode())
    else:o.number(L,value)
def run(v):
    o.top(L,0);o.errors.clear();reads=[]
    o.getglobal(L,b'_oracle_util');o.getfield(L,-1,b'GetTrueConditionByCmd');o.table(L,0,1)
    def evaluate(s):
        try:
            key=o.string(s,2,None).decode();reads.append(key);push(v['results'][key])
        except Exception as error:o.errors.append(str(error));o.nil(s)
        return 1
    o.method('GetValueByCmd',evaluate)
    o.table(L,len(v['variants']),0)
    for index,row in enumerate(v['variants'],1):
        o.table(L,2,0);push(row['condition']);rawseti(L,-2,1);push(row['value']);rawseti(L,-2,2);rawseti(L,-2,index)
    o.check(o.call(L,2,1,0,0,None))
    if o.errors:raise RuntimeError(o.errors)
    return {'value':None if kind(L,-1)==0 else o.tonumber(L,-1,None),'reads':reads}
cases=[{'variants':[{'condition':'a','value':10},{'condition':'b','value':20}],'results':{'a':a,'b':b}} for a in [None,False,True,-1,0,2.5] for b in [None,False,True,-1,0,2.5]]
cases.extend([{'variants':[{'condition':True,'value':10},{'condition':False,'value':20}],'results':{}},{'variants':[{'condition':'a','value':10},{'condition':'true','value':20}],'results':{}},{'variants':[],'results':{}}])
out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{'BattleUtilServer':o.assets['BattleUtilServer.lua']['sha256']},'scope':'Original GetTrueConditionByCmd -> GetTrueConditionIndexByCmd -> IsCondMatch; dense lists, scalar numeric selected values, supplied boolean/numeric/nil expression results. No original expression parsing, skill routing or gameplay.','fixtures':[{'input':v,'expected':run(v)} for v in cases]}
(ROOT/'tests/synthetic/original-conditional-variants.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print('Generated',len(cases),'original conditional selection cases')
