"""Original scalar skill-field router connected to original variant helpers."""
import ctypes as C
import json
from target_runtime_oracle import TargetOracle, ROOT
o=TargetOracle();L=o.state
raw=o.lib.lua_rawseti;raw.argtypes=[C.c_void_p,C.c_int,C.c_longlong];raw.restype=None
string=o.lib.lua_pushstring;string.argtypes=[C.c_void_p,C.c_char_p];string.restype=C.c_char_p
kind=o.lib.lua_type;kind.argtypes=[C.c_void_p,C.c_int];kind.restype=C.c_int
def push(v):
    if v is None:o.nil(L)
    elif isinstance(v,bool):o.boolean(L,v)
    elif isinstance(v,str):string(L,v.encode())
    elif isinstance(v,(int,float)):o.number(L,v)
    else:
        o.table(L,0,len(v))
        for key,value in (enumerate(v,1) if isinstance(v,list) else v.items()):
            push(value)
            if str(key).isdigit():raw(L,-2,int(key))
            else:o.setfield(L,-2,key.encode())
def run(v):
    o.top(L,0);o.errors.clear();reads=[]
    o.getglobal(L,b'_oracle_cmd');o.getfield(L,-1,b'GetSkillConfigTQText');o.table(L,0,4)
    o.number(L,1);o.setfield(L,-2,b'skillConfigId');o.number(L,9);o.setfield(L,-2,b'castRoleUid')
    def expression(s):
        try:key=o.string(s,2,None).decode();reads.append(key);push(v['results'][key])
        except Exception as error:o.errors.append(str(error));o.nil(s)
        return 1
    o.method('GetValueByCmd',expression)
    o.table(L,0,2);push({'Skill':{'1':v['skill']}});o.setfield(L,-2,b'battleDT')
    def role(s):
        o.table(s,0,2)
        def is_awaker(state):o.boolean(state,v['isAwaker']);return 1
        def progression(state):o.number(state,v['breakSkillLevel']);o.number(state,v['potencyLevel']);return 2
        o.method('IsRoleType',is_awaker);o.method('GetBreakSkillAndPotencyLevel',progression);return 1
    o.method('GetObj',role);o.setfield(L,-2,b'battleEngine');string(L,v['field'].encode())
    o.check(o.call(L,2,1,0,0,None))
    if o.errors:raise RuntimeError(o.errors)
    tag=kind(L,-1)
    if tag not in [0,3,4]:raise RuntimeError('Unsupported fixture result')
    return {'value':None if tag==0 else o.tonumber(L,-1,None) if tag==3 else o.string(L,-1,None).decode(),'reads':reads}
forms=[('CmdList',{'CmdList':{'0':10,'1003':20}}),('CmdList',{'CmdList':10,'tempCmdList':[['true',30],['active',40]]}),('CmdList',{'IsPVP':True,'CmdList':[['true',50],['active',60]]}),('Para',{'IsPVP':True,'Para':{'0':'Arg1','1003':'Arg2'}}),('CmdList',{'CmdList':10,'tempCmdList':0}),('CmdList',{'CmdList':0,'tempCmdList':False}),('CmdList',{}),('CmdList',{'CmdList':False})]
fixtures=[]
for field,skill in forms:
    for awaker in [False,True]:
        for level in [0,3]:
            for active in [0,1]:
                v={'field':field,'skill':skill,'isAwaker':awaker,'breakSkillLevel':1,'potencyLevel':level,'results':{'active':active}}
                fixtures.append({'input':v,'expected':run(v)})
out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleCmdServer','BattleUtilServer','BattleConst']},'scope':'64 original GetSkillConfigTQText calls connected to original variant helpers; supplied skill tables, role/progression getters and expression outcomes. No real skill preprocessing, missing-role handling, list fields, card execution or gameplay.','fixtures':fixtures}
(ROOT/'tests/synthetic/original-skill-field-routing.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print('Generated',len(fixtures),'connected skill-field routing cases')
