"""Original argument construction + original compiled expressions in one Lua state."""
import ctypes as C
import json
from target_runtime_oracle import TargetOracle, ROOT

class ConnectedArguments(TargetOracle):
    def __init__(self,asset_overrides=None):
        super().__init__(asset_overrides);self.module('FuncTable',(asset_overrides or {}).get('FuncTable'));self.setglobal(self.state,b'_argument_closures')
        self.rawset=self.lib.lua_rawseti;self.rawset.argtypes=[C.c_void_p,C.c_int,C.c_longlong];self.rawset.restype=None
        self.rawget=self.lib.lua_rawgeti;self.rawget.argtypes=[C.c_void_p,C.c_int,C.c_longlong];self.rawget.restype=C.c_int
        self.pushstr=self.lib.lua_pushstring;self.pushstr.argtypes=[C.c_void_p,C.c_char_p];self.pushstr.restype=C.c_char_p
        self.gettop=self.lib.lua_gettop;self.gettop.argtypes=[C.c_void_p];self.gettop.restype=C.c_int
        self.length=self.lib.lua_rawlen;self.length.argtypes=[C.c_void_p,C.c_int];self.length.restype=C.c_size_t
        self.kind=self.lib.lua_type;self.kind.argtypes=[C.c_void_p,C.c_int];self.kind.restype=C.c_int
        api=json.loads((ROOT/'research/extracted/config/BattleApi.json').read_text(encoding='utf-8'))
        self.expressions={name:api[name]['Data'] for name in ['BattleFomula1','BattleFomula2']}
    def array(self,s,values):
        self.table(s,len(values),0)
        for index,value in enumerate(values,1):
            if isinstance(value,str):self.pushstr(s,value.encode())
            else:self.number(s,value)
            self.rawset(s,-2,index)
    def expression(self,s,key):
        base=self.gettop(s);key=self.expressions.get(key,key)
        self.getglobal(s,b'_argument_closures');self.getfield(s,-1,key.encode())
        if self.kind(s,-1)!=6:raise RuntimeError('Missing original expression '+key)
        self.table(s,0,len(self.members)+2)
        for name,value in {**self.members,'SkillLevel':self.v['growth']['skillLevel'],'BattleAtkForce':self.v['attack']}.items():self.number(s,value);self.setfield(s,-2,name.encode())
        self.check(self.call(s,1,-1,0,0,None));values=[]
        for index in range(base+2,self.gettop(s)+1):
            if self.kind(s,index)!=3:raise RuntimeError('Nonnumeric compiled result')
            values.append(self.tonumber(s,index,None))
        self.top(s,base);return values
    def run(self,v):
        self.v=v;self.members={};self.writes=[];self.errors.clear();L=self.state;self.top(L,0)
        self.getglobal(L,b'_oracle_cmd');self.getfield(L,-1,b'GetSkillArgs');self.table(L,0,10)
        self.number(L,1);self.setfield(L,-2,b'skillConfigId');self.array(L,v['overrides']);self.setfield(L,-2,b'createCardArgs')
        self.table(L,0,1);self.table(L,0,1);self.table(L,1,0);self.table(L,0,0);self.rawset(L,-2,1);self.setfield(L,-2,b'Skill');self.setfield(L,-2,b'battleDT');self.setfield(L,-2,b'battleEngine')
        self.getglobal(L,b'_oracle_cmd');self.getfield(L,-1,b'__CalcBaseSkillArgs');self.setfield(L,-3,b'__CalcBaseSkillArgs');self.top(L,-2)
        def text(s):
            key=self.string(s,2,None).decode()
            if key=='Para':self.pushstr(s,v['parameterExpression'].encode())
            else:self.nil(s)
            return 1
        def lists(s):
            try:
                key=self.string(s,2,None).decode();self.array(s,v['growth']['formulaNames' if key=='CoefficientTypelist' else 'originalCoefficients'])
            except Exception as error:self.errors.append(str(error));self.nil(s)
            return 1
        def member(s):
            try:
                key=self.string(s,2,None).decode();value=self.tonumber(s,3,None);self.members[key]=value;self.writes.append({'name':key,'value':value})
            except Exception as error:self.errors.append(str(error))
            return 0
        def evaluate(as_list):
            def run(s):
                try:
                    values=self.expression(s,self.string(s,2,None).decode())
                    if as_list:self.array(s,values)
                    else:self.number(s,values[0])
                except Exception as error:self.errors.append(str(error));self.nil(s)
                return 1
            return run
        for name,method in [('GetSkillConfigTQText',text),('GetSkillConfigTQList',lists),('SetMemberValue',member),('GetValueByCmd',evaluate(False)),('GetValueListByCmd',evaluate(True))]:self.method(name,method)
        self.check(self.call(L,1,2,0,0,None))
        if self.errors:raise RuntimeError(self.errors)
        args=[]
        for index in range(1,self.length(L,-2)+1):self.rawget(L,-2,index);args.append(self.tonumber(L,-1,None));self.top(L,-2)
        return {'arguments':args,'memberWrites':self.writes}

if __name__=='__main__':
    o=ConnectedArguments();fixtures=[]
    for level in [1,2,6]:
        for attack in [0,138,258,300.25]:
            for coefficients in [[.1,5],[0,0],[.4,2]]:
                for overrides in [[],[0],[.5]]:
                    v={'growth':{'formulaNames':['BattleFomula1','BattleFomula2'],'originalCoefficients':coefficients,'skillLevel':level},'attack':attack,'parameterExpression':'BattleAtkForce*GrowArgValue1,GrowArgValue2','overrides':overrides}
                    fixtures.append({'input':v,'expected':o.run(v)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleCmdServer','FuncTable','BattleApi']},'formulaExpressions':o.expressions,'scope':'Original GetSkillArgs -> __CalcBaseSkillArgs with original compiled growth/parameter closures, one Lua state. Selected coefficient lists/Para supplied, member storage and expression-environment/closure lookup adapted, descriptions absent. No original skill routing, parser, attack/level derivation, card execution or gameplay.','fixtures':fixtures}
    (ROOT/'tests/synthetic/original-connected-skill-arguments.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(fixtures),'connected original skill argument cases')
