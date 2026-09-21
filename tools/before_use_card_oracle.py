"""Execute original BEBeforeUseCard.DoEffect through energy mutation and event request."""
import ctypes as C
import json

from connected_card_payment_oracle import ConnectedPaymentOracle, ROOT


class BeforeUseCardOracle(ConnectedPaymentOracle):
    def __init__(self,asset_overrides=None):
        super().__init__(asset_overrides);self.tobool=self.lib.lua_toboolean;self.tobool.argtypes=[C.c_void_p,C.c_int];self.tobool.restype=C.c_int

    def run_before(self,v):
        self.prepare(v['energy']);L=self.state;self.top(L,0);trace=[];created=[]
        self.run(dict(cfgCost=v['cfgCost'],energy=v['energy'],originCost=2,delta=0,harmonize=0,fixedSwitches={},keeper=False,keeperCost=None,pvp=False))
        self.getglobal(L,b'_cost_self');self.number(L,500);self.setfield(L,-2,b'uid');self.number(L,4);self.setfield(L,-2,b'deck')
        self.method('AllowIgnoreCost',lambda s:(self.boolean(s,v['allowIgnoreCost']),1)[1]);self.method('AddConsumeEnergyStats',lambda s:(trace.append('energyStats:'+str(self.tonumber(s,2,None))),0)[1]);self.top(L,0)
        self.table(L,0,4)
        self.method('IsAttachPost',lambda s:(self.boolean(s,v['attached']),1)[1]);self.method('HasMemberValue',lambda s:(self.boolean(s,v['forceMode'] is not None),1)[1]);self.method('GetMemberValue',lambda s:(self.push(s,v['forceMode']),1)[1])
        self.method('SetMemberValue',lambda s:0);self.table(L,0,1);self.method('SetMemberValue',lambda s:0);self.setfield(L,-2,b'cmdParser');self.setglobal(L,b'_before_cmd')
        self.table(L,0,1);self.method('InsertHistory',lambda s:(trace.append('history'),0)[1]);self.method('InsertBoutHistory',lambda s:(trace.append('boutHistory'),0)[1]);self.setglobal(L,b'_before_card_mgr')
        self.table(L,0,1);self.method('GetCurCamp',lambda s:(self.number(s,1),1)[1]);self.setglobal(L,b'_before_bout_mgr')
        self.table(L,0,1);self.method('GetPlayer',lambda s:(self.getglobal(s,b'_energy_player'),1)[1]);self.setglobal(L,b'_before_role_mgr')
        self.table(L,0,1);self.method('OnUseCard',lambda s:(trace.append('record'),0)[1]);self.setglobal(L,b'_before_record_mgr')
        self.table(L,0,1)
        def create(s):
            self.getfield(s,2,b'effectType');effect_type=self.string(s,-1,None).decode();self.top(s,-2)
            self.getfield(s,2,b'eventData');self.getfield(s,-1,b'castValue');cast=self.tonumber(s,-1,None);self.top(s,-3)
            created.append({'effectType':effect_type,'castValue':cast});trace.append('beforeEvent');return 0
        self.method('CreateEffect',create);self.setglobal(L,b'_before_effect_mgr')
        self.table(L,0,12)
        self.method('GetObj',lambda s:(self.getglobal(s,b'_cost_self'),1)[1] if v['hasCard'] else (self.nil(s),1)[1])
        for field,name in [('cardMgr',b'_before_card_mgr'),('boutMgr',b'_before_bout_mgr'),('roleMgr',b'_before_role_mgr'),('recordMgr',b'_before_record_mgr'),('effectMgr',b'_before_effect_mgr')]:self.getglobal(L,name);self.setfield(L,-2,field.encode())
        for name in ('Error','DebugS'):self.method(name,lambda s:0)
        self.setglobal(L,b'_before_engine')
        self.table(L,0,8);self.table(L,0,3);self.number(L,500);self.setfield(L,-2,b'cardUid');self.number(L,9);self.setfield(L,-2,b'castRoleUid');self.setfield(L,-2,b'effectConfig')
        self.getglobal(L,b'_before_engine');self.setfield(L,-2,b'battleEngine');self.getglobal(L,b'_before_cmd');self.setfield(L,-2,b'cmdServer')
        self.method('IsTriggerBST',lambda s:(self.boolean(s,v['trigger']),1)[1])
        for name in ('DoEffect','__CostEnergy','__FireBeforeUseCard'):
            self.getglobal(L,b'_payment_class');self.getfield(L,-1,name.encode());self.setfield(L,-3,name.encode());self.top(L,-2)
        self.setglobal(L,b'_before_self')
        self.getglobal(L,b'_before_self');self.getfield(L,-1,b'DoEffect');self.getglobal(L,b'_before_self');self.check(self.call(L,1,1,0,0,None));returned=None if self.kind(L,-1)==0 else bool(self.tobool(L,-1));self.top(L,0)
        self.getglobal(L,b'_hp_property');self.getfield(L,-1,b'properties');self.getfield(L,-1,b'energy');energy_after=self.tonumber(L,-1,None)
        if self.errors:raise RuntimeError(self.errors)
        return {'returned':returned,'energyAfter':energy_after,'trace':trace,'paymentEvents':self.events,'created':created}


BASE={'hasCard':True,'energy':5,'cfgCost':'2','attached':False,'forceMode':None,'allowIgnoreCost':False,'trigger':True}
CASES=[
 {'name':'missing-card',**BASE,'hasCard':False},
 {'name':'ordinary-triggered',**BASE},
 {'name':'ordinary-untriggered',**BASE,'trigger':False},
 {'name':'attached-triggered',**BASE,'attached':True},
 {'name':'forced-free',**BASE,'forceMode':1},
 {'name':'x-cost',**BASE,'cfgCost':'X'},
]


def main():
    oracle=BeforeUseCardOracle();fixtures=[{'input':row,'expected':oracle.run_before(row)} for row in CASES]
    output=ROOT/'tests/synthetic/original-before-use-card.json'
    output.write_text(json.dumps({'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{name:oracle.assets[name+'.lua']['sha256'] for name in ('BEBeforeUseCard','BattleUnitPlayer','BattlePropertyServer','BattleCardServer','BattleUtilServer','BattleConst')},'scope':'Original BEBeforeUseCard.DoEffect through original cost resolution, player energy mutation, record call and optional BeforeUseCard effect request. Explicit adapters; no listener dispatch, later skill phase, gameplay or holdout.','fixtures':fixtures},indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Generated',len(fixtures),'original before-use card cases')


if __name__=='__main__':main()
