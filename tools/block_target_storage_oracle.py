"""Copied-original final Block modifier and Block-property storage probes."""
import ctypes as C
import itertools
import json
from target_runtime_oracle import TargetOracle, ROOT
from hp_property_oracle import HpPropertyOracle


class FinalBlockOracle(TargetOracle):
    def __init__(self):
        super().__init__();L=self.state
        self.getglobal(L,b'_oracle_target')
        def get(s):
            key=self.string(s,2,None).decode()
            self.number(s,self.values[key])
            return 1
        self.method('GetProperty',get);self.top(L,0)

    def run(self,show,percent,flat):
        self.values={'gain_block_per':percent,'gain_block_plus':flat};L=self.state;self.top(L,0)
        self.getglobal(L,b'_oracle_cmd');self.getfield(L,-1,b'__GetFinalBlock');self.getglobal(L,b'_oracle_self');self.number(L,show);self.getglobal(L,b'_oracle_target');self.nil(L)
        self.check(self.call(L,4,1,0,0,None));return self.tonumber(L,-1,None)


class BlockStorageOracle(HpPropertyOracle):
    def run(self,block,max_hp,block_max_per,request,ignore_max):
        L=self.state;self.events=[];self.top(L,0);self.getglobal(L,b'_hp_property');self.table(L,0,3)
        for key,value in [('block',block),('max_hp',max_hp),('block_max_per',block_max_per)]:self.number(L,value);self.setfield(L,-2,key.encode())
        self.setfield(L,-2,b'properties');self.top(L,0)
        self.getglobal(L,b'_hp_property');self.getfield(L,-1,b'AddProperty');self.getglobal(L,b'_hp_property')
        self.getglobal(L,b'_oracle_bc');self.getfield(L,-1,b'BattleProperty');self.getfield(L,-1,b'block');self.setglobal(L,b'_block_key');self.top(L,-3);self.getglobal(L,b'_block_key')
        self.number(L,request);self.table(L,0,2);self.boolean(L,ignore_max);self.setfield(L,-2,b'ignoreMax');self.number(L,request);self.setfield(L,-2,b'castValue')
        self.check(self.call(L,4,1,0,0,None));after=self.tonumber(L,-1,None)
        return {'blockAfter':after,'actualBlockGained':after-block}


if __name__=='__main__':
    final=FinalBlockOracle();storage=BlockStorageOracle()
    final_rows=[]
    for show,percent,flat in itertools.product([1,10,100,1000],[-200,-100,-25,0,50,100],[-100,-1,0,0.2,25,100]):
        final_rows.append({'input':{'showBlock':show,'gainBlockPer':percent,'gainBlockPlus':flat},'expected':final.run(show,percent,flat)})
    storage_rows=[]
    for block,max_hp,max_per,request,ignore in itertools.product([0,50,100,150],[0,100],[0,50],[0,1,25,100,200],[False,True]):
        storage_rows.append({'input':{'block':block,'maxHp':max_hp,'blockMaxPer':max_per,'request':request,'ignoreMax':ignore},'expected':storage.run(block,max_hp,max_per,request,ignore)})
    output={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{n:final.assets[n+'.lua']['sha256'] for n in ['BattleCmdServer','BattlePropertyServer']},
        'scope':'144 original __GetFinalBlock cases with explicit recipient properties plus 160 original BattlePropertyServer.AddProperty block-cap/storage cases. Owner/send callbacks are observational spies. No show formula assembly, effect repetition, listeners, Block events, full command or gameplay.',
        'finalBlock':final_rows,'storage':storage_rows}
    (ROOT/'tests/synthetic/original-block-target-storage.json').write_text(json.dumps(output,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(final_rows),'final Block and',len(storage_rows),'storage cases')
