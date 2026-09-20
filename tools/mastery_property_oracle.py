"""Original mastery property mutation and nested notification order."""
import json
import math
import ctypes as C
from hp_property_oracle import HpPropertyOracle, ROOT
class MasteryOracle(HpPropertyOracle):
    def __init__(self):
        super().__init__()
        self.pushstring=self.lib.lua_pushstring;self.pushstring.argtypes=[C.c_void_p,C.c_char_p];self.pushstring.restype=C.c_void_p
    def run(self,values):
        L=self.state;self.events=[];self.top(L,0);self.getglobal(L,b'_hp_property');self.table(L,0,3)
        fields={'occupation_master':values['mastery'],'occupation_master_final_per':values['percent'],'occupation_master_final':math.ceil(values['mastery']*(100+values['percent'])/100)}
        for key,value in fields.items():self.number(L,value);self.setfield(L,-2,key.encode())
        self.setfield(L,-2,b'properties');self.top(L,0)
        self.getglobal(L,b'_hp_property');self.getfield(L,-1,b'ChangeProperty');self.getglobal(L,b'_hp_property')
        self.pushstring(L,values['property'].encode());self.number(L,values['delta']);self.table(L,0,0)
        self.check(self.call(L,4,0,0,0,None));self.top(L,0)
        self.getglobal(L,b'_hp_property');self.getfield(L,-1,b'properties');after={}
        for key in fields:self.getfield(L,-1,key.encode());after[key]=self.tonumber(L,-1,None);self.top(L,-2)
        if self.errors:raise RuntimeError(self.errors)
        return {'properties':after,'callbacks':self.events}
if __name__=='__main__':
    o=MasteryOracle();cases=[]
    for mastery in [0,24,79.5,144]:
        for percent in [0,25,100]:
            for prop in ['occupation_master','occupation_master_final_per']:
                for delta in [0,0.25,1,10,-0.25,-10]:
                    if (mastery if prop=='occupation_master' else percent)+delta<0:continue
                    value={'mastery':mastery,'percent':percent,'property':prop,'delta':delta}
                    cases.append({'input':value,'expected':o.run(value)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHash':o.assets['BattlePropertyServer.lua']['sha256'],
        'scope':'Original ChangeProperty/AddProperty/SubProperty and nested final-mastery SetProperty, using explicit stored properties. Owner and send callbacks are observational spies; owner has no player type, so keeper-skill refresh returns early. No constructor, keeper-skill recalculation, event dispatch or gameplay.','fixtures':cases}
    (ROOT/'tests/synthetic/original-mastery-property.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(cases),'original mastery mutation cases')
