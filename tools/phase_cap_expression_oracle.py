"""Execute compiled phase-cap command expressions against live synthetic layers."""
import ctypes as C
import itertools
import json
import math

from runtime_oracle import Oracle, ROOT


class PhaseCapExpressionOracle(Oracle):
    def __init__(self,func_asset=None):
        super().__init__();L=self.state;self.module('FuncTable',func_asset);self.setglobal(L,b'_phase_functions')
        self.kind=self.lib.lua_type;self.kind.argtypes=[C.c_void_p,C.c_int];self.kind.restype=C.c_int
        self.tobool=self.lib.lua_toboolean;self.tobool.argtypes=[C.c_void_p,C.c_int];self.tobool.restype=C.c_int
        self.boolean=self.lib.lua_pushboolean;self.boolean.argtypes=[C.c_void_p,C.c_int];self.boolean.restype=None
        self.pushstring=self.lib.lua_pushstring;self.pushstring.argtypes=[C.c_void_p,C.c_char_p];self.pushstring.restype=C.c_char_p
        self.callbacks=[]
        @C.CFUNCTYPE(C.c_int,C.c_void_p)
        def ceil_value(state):self.number(state,math.ceil(self.tonumber(state,1,None)));return 1
        self.ceil_value=ceil_value;self.callbacks.append(ceil_value);self.table(L,0,1);self.pushclosure(L,ceil_value,0);self.setfield(L,-2,b'ceil');self.setglobal(L,b'math')
        @C.CFUNCTYPE(C.c_int,C.c_void_p)
        def layer(state):
            state_id=int(self.tonumber(state,1,None));self.reads.append(state_id);self.number(state,self.layers.get(state_id,0));return 1
        self.layer=layer;self.callbacks.append(layer)

    def expression(self,expression,argument,last_condition,max_hp):
        if isinstance(expression,(int,float)):return [expression]
        L=self.state;self.top(L,0);self.getglobal(L,b'_phase_functions');self.getfield(L,-1,expression.encode())
        if self.kind(L,-1)!=6:raise ValueError('Missing compiled command expression '+expression)
        self.table(L,0,5);self.number(L,argument);self.setfield(L,-2,b'Arg1');self.number(L,last_condition);self.setfield(L,-2,b'LastConditionRet');self.getglobal(L,b'math');self.setfield(L,-2,b'math')
        self.table(L,0,2);self.number(L,max_hp);self.setfield(L,-2,b'max_hp');self.pushclosure(L,self.layer,0);self.setfield(L,-2,b'GetStateLayer');self.setfield(L,-2,b'UpperTarget')
        self.check(self.call(L,1,2,0,0,None));values=[]
        for index in (-2,-1):
            tag=self.kind(L,index)
            if tag==0:continue
            if tag==1:values.append(bool(self.tobool(L,index)))
            elif tag==3:values.append(self.tonumber(L,index,None))
            else:raise ValueError('Unexpected phase expression result')
        return values

    def run(self,rows,case):
        phase_id=case['phaseId'];self.layers={phase_id:case['phaseLayers'],60407:case['counter']};self.reads=[];trace=[];operations=[];last_condition=0;immune=False;skill=None
        for index,row in sorted(rows.items(),key=lambda item:int(item[0])):
            condition_reads=[]
            if 'Cond' in row:
                before=len(self.reads);result=self.expression(row['Cond'],case['hpLoss'],last_condition,case['maxHp']);condition_reads=self.reads[before:]
                if len(result)!=1 or not isinstance(result[0],bool):raise ValueError('Expected boolean condition')
                passed=result[0];last_condition=1 if passed else 0
                if not passed:
                    trace.append({'row':int(index),'type':row['Type'],'passed':False,'conditionReads':condition_reads});continue
            before=len(self.reads);params=self.expression(row['Para'],case['hpLoss'],last_condition,case['maxHp']);parameter_reads=self.reads[before:]
            state_id=int(params[0]);amount=params[1] if len(params)>1 else 1;effect=row['Type']
            trace.append({'row':int(index),'type':effect,'passed':True,'params':params,'conditionReads':condition_reads,'parameterReads':parameter_reads})
            if effect=='BEAddState':
                self.layers[state_id]=min(999999999,self.layers.get(state_id,0)+math.ceil(amount))
                if state_id==60407:operations.append({'type':'addCounter','stateId':60407,'requested':case['hpLoss'],'layers':self.layers[state_id]})
                else:
                    operations.append({'type':'addState','stateId':state_id,'layers':self.layers[state_id]})
                    if state_id==46441:immune=True
            elif effect=='BESubStateLayer':
                self.layers[state_id]=max(0,self.layers.get(state_id,0)-math.ceil(abs(amount)))
                operations.append({'type':'subtractPhase','stateId':state_id,'layers':self.layers[state_id]})
            elif effect=='BERemoveState':
                self.layers[state_id]=0;operations.append({'type':'removeState','stateId':state_id})
            elif effect=='BEMonsterChangeSkill':
                skill=int(params[0]);operations.append({'type':'changeMonsterSkill','skillId':skill,'changeType':int(params[1])})
            else:raise ValueError('Unexpected phase effect '+effect)
        ending_phase=60408 if phase_id==60409 and self.layers.get(60408,0)>0 else phase_id
        if self.layers.get(ending_phase,0)==0:ending_phase=0
        return {'state':{'maxHp':case['maxHp'],'phaseId':ending_phase,'phaseLayers':self.layers.get(ending_phase,0),'counter':self.layers.get(60407,0),'immune':immune},'operations':operations,'passedRows':[row['row'] for row in trace if row['passed']],'layerReads':self.reads,'skill':skill}


def main():
    oracle=PhaseCapExpressionOracle();commands=json.loads((ROOT/'research/extracted/config/Cmd.json').read_text(encoding='utf-8'));fixtures=[]
    cases=itertools.product((1,1000,12345),(60409,60408),(1,2,330,331,500),(0,10,999999990),(1,2,125,330,500))
    for max_hp,phase_id,layers,counter,hp_loss in cases:
        command_id=60406 if phase_id==60409 else 60405;case={'maxHp':max_hp,'phaseId':phase_id,'phaseLayers':layers,'counter':counter,'hpLoss':hp_loss,'commandId':command_id}
        fixtures.append({'input':case,'expected':oracle.run(commands[str(command_id)]['data_list'],case)})
    output=ROOT/'tests/synthetic/original-phase-cap-expressions.json'
    output.write_text(json.dumps({'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{name:oracle.assets[name+'.lua']['sha256'] for name in ('FuncTable','Cmd')},'scope':'Original compiled Cond/Para closures for every row of commands 60406 and 60405 with live state-layer and max-HP adapters. Python iterates the configured rows and applies separately recovered integer add/subtract/remove semantics; monster skill change is recorded. No original parser, effect construction/body, state manager, event scheduler, gameplay or holdout credit.','fixtures':fixtures},indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Generated',len(fixtures),'phase-cap expression sequences')


if __name__=='__main__':main()
