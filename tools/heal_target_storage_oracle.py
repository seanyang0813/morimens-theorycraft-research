"""Copied-original final Heal modifier and BattleUnitBase.Heal probes."""
import itertools
import json
from target_runtime_oracle import TargetOracle, ROOT
from behit_hp_oracle import BeHitHpOracle

class FinalHealOracle(TargetOracle):
    def __init__(self):
        super().__init__();L=self.state;self.getglobal(L,b'_oracle_target')
        def get(s):key=self.string(s,2,None).decode();self.number(s,self.values[key]);return 1
        self.method('GetProperty',get);self.top(L,0)
    def run(self,show,percent,flat):
        self.values={'be_heal_per':percent,'be_heal_plus':flat};L=self.state;self.top(L,0);self.getglobal(L,b'_oracle_cmd');self.getfield(L,-1,b'__GetFinalHeal');self.getglobal(L,b'_oracle_self');self.number(L,show);self.getglobal(L,b'_oracle_target');self.nil(L);self.check(self.call(L,4,1,0,0,None));return self.tonumber(L,-1,None)

class HealStorageOracle(BeHitHpOracle):
    def run(self,hp,max_hp,request):
        L=self.state;self.events=[];self.top(L,0);self.getglobal(L,b'_hp_property');self.table(L,0,2)
        for key,value in [('hp',hp),('max_hp',max_hp)]:self.number(L,value);self.setfield(L,-2,key.encode())
        self.setfield(L,-2,b'properties');self.top(L,0);self.getglobal(L,b'_behit_unit');self.getfield(L,-1,b'Heal');self.getglobal(L,b'_behit_unit');self.number(L,request);self.table(L,0,1);self.number(L,request);self.setfield(L,-2,b'castValue');self.check(self.call(L,3,2,0,0,None));real=self.tonumber(L,-2,None);overflow=self.tonumber(L,-1,None)
        self.top(L,0);self.getglobal(L,b'_hp_property');self.getfield(L,-1,b'properties');self.getfield(L,-1,b'hp');after=self.tonumber(L,-1,None);return {'hpAfter':after,'realHeal':real,'overFlowHeal':overflow}

if __name__=='__main__':
    final=FinalHealOracle();storage=HealStorageOracle();final_rows=[]
    for show,percent,flat in itertools.product([1,10,100,1000],[-200,-100,-25,0,50,100],[-100,-1,0,0.2,25,100]):final_rows.append({'input':{'showHeal':show,'beHealPer':percent,'beHealPlus':flat},'expected':final.run(show,percent,flat)})
    storage_rows=[]
    for hp,max_hp,request in itertools.product([0,0.5,50,99,100],[0,100,150],[-200,-1,0,0.2,1,25,100,200]):storage_rows.append({'input':{'hp':hp,'maxHp':max_hp,'request':request},'expected':storage.run(hp,max_hp,request)})
    output={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{n:final.assets[n+'.lua']['sha256'] for n in ['BattleCmdServer','BattleUnitBase','BattlePropertyServer']},'scope':'144 original __GetFinalHeal cases with explicit recipient properties plus 120 original BattleUnitBase.Heal/SetProperty HP rounding, cap and overflow cases. Property callbacks are observational spies. No show-formula property assembly, target life eligibility, effect repetition, Heal events, full command or gameplay.','finalHeal':final_rows,'storage':storage_rows}
    (ROOT/'tests/synthetic/original-heal-target-storage.json').write_text(json.dumps(output,indent=2)+'\n',encoding='utf-8');print('Generated',len(final_rows),'final Heal and',len(storage_rows),'storage cases')
