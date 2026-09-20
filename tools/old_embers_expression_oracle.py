"""Original command condition/parameter closures with explicit live state adapters."""
import ctypes as C
import json
import math
from runtime_oracle import Oracle, ROOT
class EmbersExpressionOracle(Oracle):
    def __init__(self):
        super().__init__();self.module('FuncTable');self.setglobal(self.state,b'_embers_functions')
        self.kind=self.lib.lua_type;self.kind.argtypes=[C.c_void_p,C.c_int];self.kind.restype=C.c_int
        self.tobool=self.lib.lua_toboolean;self.tobool.argtypes=[C.c_void_p,C.c_int];self.tobool.restype=C.c_int
        @C.CFUNCTYPE(C.c_int,C.c_void_p)
        def layer(s):
            key=int(self.tonumber(s,1,None));self.number(s,self.layers.get(key,0));return 1
        self.layer=layer
    def expression(self,expression,argument):
        if isinstance(expression,(int,float)):return [expression]
        L=self.state;self.top(L,0);self.getglobal(L,b'_embers_functions');self.getfield(L,-1,expression.encode())
        if self.kind(L,-1)!=6:raise ValueError('Missing compiled command expression '+expression)
        self.table(L,0,2);self.number(L,argument);self.setfield(L,-2,b'Arg1')
        self.table(L,0,1);self.pushclosure(L,self.layer,0);self.setfield(L,-2,b'GetStateLayer');self.setfield(L,-2,b'UpperTarget')
        self.check(self.call(L,1,2,0,0,None));result=[]
        for index in [-2,-1]:
            tag=self.kind(L,index)
            if tag==0:continue
            if tag==1:result.append(bool(self.tobool(L,index)))
            elif tag==3:result.append(self.tonumber(L,index,None))
            else:raise ValueError('Unexpected command result')
        return result
    def run(self,rows,case):
        self.layers={80575:case['layers'],80593:0,80594:0,66314:case['blocker'],62317:0};trace=[]
        for index,row in sorted(rows.items(),key=lambda p:int(p[0])):
            if 'Cond' in row and self.expression(row['Cond'],case['argument'])!=[True]:continue
            params=self.expression(row['Para'],case['argument']);trace.append({'row':int(index),'type':row['Type'],'params':params})
            if row['Type']=='BEAddState':self.layers[int(params[0])]=1
            if row['Type']=='BERemoveState':self.layers[int(params[0])]=0
            if row['Type']=='BESubStateLayer':self.layers[int(params[0])]=max(0,self.layers[int(params[0])]-math.ceil(abs(params[1])))
        return {'trace':trace,'layersAfter':self.layers[80575]}
if __name__=='__main__':
    o=EmbersExpressionOracle();commands=json.loads((ROOT/'research/extracted/config/Cmd.json').read_text(encoding='utf-8'));fixtures=[]
    for cmd in [80572,81060]:
        for layers in [0,2,3,100]:
            for argument in [0,2.5,3,5]:
                for blocker in [0,1]:
                    case={'commandId':cmd,'layers':layers,'argument':argument,'blocker':blocker}
                    fixtures.append({'input':case,'expected':o.run(commands[str(cmd)]['data_list'],case)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original FuncTable condition/parameter closures selected from original Cmd rows, with live state getter. Python iterates rows and applies marker/stack adapters. HP effects are recorded only. Not original parser, scheduler, state effects, command executor or gameplay.',
        'sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['FuncTable','Cmd']},
        'commands':{str(cmd):[{'id':str(index),**{key:value for key,value in row.items() if key in ['Type','Target','Para','Cond']}} for index,row in sorted(commands[str(cmd)]['data_list'].items(),key=lambda item:int(item[0]))] for cmd in [80572,81060]},'fixtures':fixtures}
    (ROOT/'tests/synthetic/original-old-embers-expressions.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(fixtures),'original Old Embers expression sequences')
