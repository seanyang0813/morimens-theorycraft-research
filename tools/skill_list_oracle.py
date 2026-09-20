"""Original GetTQList on exported coefficient fields and explicit sparse variants."""
import ctypes as C
import json
from runtime_oracle import Oracle, ROOT
o=Oracle();L=o.state
rawset=o.lib.lua_rawseti;rawset.argtypes=[C.c_void_p,C.c_int,C.c_longlong];rawset.restype=None
rawget=o.lib.lua_rawgeti;rawget.argtypes=[C.c_void_p,C.c_int,C.c_longlong];rawget.restype=C.c_int
length=o.lib.lua_rawlen;length.argtypes=[C.c_void_p,C.c_int];length.restype=C.c_size_t
kind=o.lib.lua_type;kind.argtypes=[C.c_void_p,C.c_int];kind.restype=C.c_int
pushstr=o.lib.lua_pushstring;pushstr.argtypes=[C.c_void_p,C.c_char_p];pushstr.restype=C.c_char_p
o.getglobal(L,b'table');o.getglobal(L,b'next');o.setfield(L,-2,b'next')
@C.CFUNCTYPE(C.c_int,C.c_void_p)
def clone(s):o.pushvalue(s,1);return 1
o.pushclosure(L,clone,0);o.setfield(L,-2,b'clone');o.top(L,0)
def push(v):
    if v is None:o.lib.lua_pushnil(L)
    elif isinstance(v,str):pushstr(L,v.encode())
    elif isinstance(v,(int,float)):o.number(L,v)
    else:
        o.table(L,0,len(v))
        for key,item in (enumerate(v,1) if isinstance(v,list) else v.items()):push(item);rawset(L,-2,int(key))
o.lib.lua_pushnil.argtypes=[C.c_void_p];o.lib.lua_pushnil.restype=None
def run(v):
    o.top(L,0);o.getglobal(L,b'_oracle_util');o.getfield(L,-1,b'GetTQList');push(v['value']);o.number(L,v['breakSkillLevel']);o.number(L,v['potencyLevel']);o.check(o.call(L,3,1,0,0,None))
    if kind(L,-1)==0:return None
    if kind(L,-1)!=5:raise RuntimeError('Expected selected list')
    result=[]
    for i in range(1,length(L,-1)+1):
        rawget(L,-1,i);tag=kind(L,-1)
        if tag not in [3,4]:raise RuntimeError('Unsupported selected list entry')
        result.append(o.tonumber(L,-1,None) if tag==3 else o.string(L,-1,None).decode());o.top(L,-2)
    return result
skills=json.loads((ROOT/'research/extracted/config/Skill.json').read_text(encoding='utf-8'))
values=[{'source':sid+':'+field,'value':skills[sid][field]} for sid in ['3997','4163','4638','57342'] for field in ['CoefficientTypelist','OriginalCoefficient']]
values.extend([{'source':'synthetic-sparse','value':{'0':[1],'1000':[2],'3':[3]}},{'source':'absent','value':None},{'source':'empty','value':{}}])
fixtures=[]
for item in values:
    for b in [0,1]:
        for p in [0,3]:
            v={'value':item['value'],'breakSkillLevel':b,'potencyLevel':p};fixtures.append({'source':item['source'],'input':v,'expected':run(v)})
out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleUtilServer','BattleConst','Skill']},'scope':'Original GetTQList/GetMatchTQ over eight exported coefficient fields plus sparse/absent/empty controls. table.next aliases Lua next; table.clone is identity, so copy isolation is not tested. No enclosing skill routing, growth evaluation or gameplay.','fixtures':fixtures}
(ROOT/'tests/synthetic/original-skill-lists.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print('Generated',len(fixtures),'original coefficient-list selections')
