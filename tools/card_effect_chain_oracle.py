"""Execute original BattleUnitBase UseCard and ordinary effect-chain construction."""
import ctypes as C
import json

from behit_hp_oracle import BeHitHpOracle, ROOT


class CardEffectChainOracle(BeHitHpOracle):
    def __init__(self,asset_overrides=None):
        super().__init__(asset_overrides);L=self.state
        self.rawlen=self.lib.lua_rawlen;self.rawlen.argtypes=[C.c_void_p,C.c_int];self.rawlen.restype=C.c_size_t
        self.rawgeti=self.lib.lua_rawgeti;self.rawgeti.argtypes=[C.c_void_p,C.c_int,C.c_int64];self.rawgeti.restype=C.c_int
        self.rawseti=self.lib.lua_rawseti;self.rawseti.argtypes=[C.c_void_p,C.c_int,C.c_int64]
        self.absindex=self.lib.lua_absindex;self.absindex.argtypes=[C.c_void_p,C.c_int];self.absindex.restype=C.c_int
        self.rawequal=self.lib.lua_rawequal;self.rawequal.argtypes=[C.c_void_p,C.c_int,C.c_int];self.rawequal.restype=C.c_int

    def _identity(self,L,index):
        index=self.absindex(L,index)
        if self.kind(L,index)==0:return None
        for label,name in [('main',b'_chain_cmd'),('pre',b'_chain_pre_cmd')]:
            self.getglobal(L,name);same=bool(self.rawequal(L,index,-1));self.top(L,-2)
            if same:return label
        return 'other'

    def _number_field(self,L,index,name):
        index=self.absindex(L,index);self.getfield(L,index,name.encode());value=None if self.kind(L,-1)==0 else self.tonumber(L,-1,None);self.top(L,-2);return value

    def _value_field(self,L,index,name):
        index=self.absindex(L,index);self.getfield(L,index,name.encode());kind=self.kind(L,-1)
        value=None if kind==0 else bool(self.tobool(L,-1)) if kind==1 else self.tonumber(L,-1,None) if kind==3 else self.string(L,-1,None).decode() if kind==4 else '<non-scalar>'
        self.top(L,-2);return value

    def run_chain(self,v):
        L=self.state;self.top(L,0);self.errors.clear();trace=[];effects=[];upper=[];member=[]
        self.table(L,0,1);self.number(L,701);self.setfield(L,-2,b'uid');self.setglobal(L,b'_chain_target1')
        self.table(L,0,1);self.number(L,702);self.setfield(L,-2,b'uid');self.setglobal(L,b'_chain_target2')
        self.table(L,0,3)
        def upper_targets(s):
            count=int(self.rawlen(s,2));ids=[]
            for i in range(1,count+1):self.rawgeti(s,2,i);ids.append(self._number_field(s,-1,'uid'));self.top(s,-2)
            upper.append(ids);return 0
        self.method('SetUpperTargets',upper_targets)
        def set_member(s):member.append({'name':self.string(s,2,None).decode(),'valueIsNil':self.kind(s,3)==0});return 0
        self.method('SetMemberValue',set_member);self.setglobal(L,b'_chain_cmd')
        self.table(L,0,0);self.setglobal(L,b'_chain_pre_cmd')
        self.table(L,0,8);self.number(L,500);self.setfield(L,-2,b'uid')
        self.method('CardTypeMatch',lambda s:(self.boolean(s,v['keeper']),1)[1])
        self.method('GetProperty',lambda s:(self.number(s,v['cardUseless']),1)[1])
        self.method('GetCardCmdServer',lambda s:(self.getglobal(s,b'_chain_cmd') if v['hasCmd'] else self.nil(s),1)[1])
        self.method('GetCardPreCmdServer',lambda s:(self.getglobal(s,b'_chain_pre_cmd') if v['hasPre'] else self.nil(s),1)[1])
        self.method('GetCmdTarget',lambda s:(self.number(s,123),1)[1]);self.setglobal(L,b'_chain_card')
        self.table(L,0,1)
        def create_effect(s):
            config=self.absindex(s,2);effects.append({'effectType':self._value_field(s,config,'effectType'),'castRoleUid':self._number_field(s,config,'castRoleUid'),'cardUid':self._number_field(s,config,'cardUid'),'camp':self._number_field(s,config,'camp'),'targetType':self._number_field(s,config,'targetType')})
            self.getfield(s,config,b'cmdServer');effects[-1]['cmdServer']=self._identity(s,-1);self.top(s,-2);return 0
        self.method('CreateEffect',create_effect);self.setglobal(L,b'_chain_effect_mgr')
        self.table(L,0,1);self.method('SetCurCaster',lambda s:(trace.append('caster:'+str(int(self.tonumber(s,2,None)))),0)[1]);self.setglobal(L,b'_chain_role_mgr')
        self.table(L,0,1);self.method('SetCurUseCard',lambda s:(trace.append('currentCard:'+str(int(self.tonumber(s,3,None)))),0)[1]);self.setglobal(L,b'_chain_card_mgr')
        self.table(L,0,1);self.method('HasStateByStateIds',lambda s:(self.boolean(s,v['stateBlocked']),1)[1]);self.setglobal(L,b'_chain_state_mgr')
        self.table(L,0,12)
        def get_obj(s):
            uid=int(self.tonumber(s,2,None))
            if uid==500 and v['hasCard']:self.getglobal(s,b'_chain_card')
            elif uid==701:self.getglobal(s,b'_chain_target1')
            elif uid==702:self.getglobal(s,b'_chain_target2')
            else:self.nil(s)
            return 1
        self.method('GetObj',get_obj);self.method('Warn',lambda s:0)
        for field,name in [('effectMgr',b'_chain_effect_mgr'),('roleMgr',b'_chain_role_mgr'),('cardMgr',b'_chain_card_mgr'),('stateMgr',b'_chain_state_mgr')]:self.getglobal(L,name);self.setfield(L,-2,field.encode())
        def run_order(s):
            trace.append('runOrder');self.pushvalue(s,2);self.check(self.call(s,0,0,0,0,None));trace.append('runOrderDone');return 0
        self.method('RunEffectOrder',run_order);self.setglobal(L,b'_chain_engine')
        self.table(L,0,10);self.number(L,9);self.setfield(L,-2,b'uid');self.number(L,1);self.setfield(L,-2,b'camp');self.getglobal(L,b'_chain_engine');self.setfield(L,-2,b'battleEngine')
        self.method('GetProperty',lambda s:(self.number(s,v['ownerUseless']),1)[1])
        self.method('AppendUseKeeperFromHandChain',lambda s:(trace.append('keeper'),self.boolean(s,True),1)[2])
        for name in ('AppendUseCardEffectChain','UseCard','IsCardHardBlockedFromPlay'):
            self.getglobal(L,b'_behit_unit');self.getfield(L,-1,name.encode());self.setfield(L,-3,name.encode());self.top(L,-2)
        self.setglobal(L,b'_chain_owner')
        if v['targets']:
            self.table(L,2,0);self.number(L,701);self.rawseti(L,-2,1);self.number(L,702);self.rawseti(L,-2,2);self.setglobal(L,b'_chain_targets')
        else:self.nil(L);self.setglobal(L,b'_chain_targets')
        method='UseCard' if v['wrapper'] else 'AppendUseCardEffectChain';self.getglobal(L,b'_chain_owner');self.getfield(L,-1,method.encode());self.getglobal(L,b'_chain_owner');self.number(L,500);self.getglobal(L,b'_chain_targets')
        self.check(self.call(L,3,1,0,0,None));returned=None if self.kind(L,-1)==0 else bool(self.tobool(L,-1))
        if self.errors:raise RuntimeError(self.errors)
        return {'returned':returned,'trace':trace,'upperTargets':upper,'memberWrites':member,'effects':effects}


BASE={'hasCard':True,'keeper':False,'cardUseless':0,'ownerUseless':0,'stateBlocked':False,'hasCmd':True,'hasPre':False,'targets':False,'wrapper':False}
CASES=[
 {'name':'missing-card',**BASE,'hasCard':False},
 {'name':'keeper-route',**BASE,'keeper':True},
 {'name':'card-hard-block',**BASE,'cardUseless':1},
 {'name':'owner-hard-block',**BASE,'ownerUseless':1},
 {'name':'state-hard-block',**BASE,'stateBlocked':True},
 {'name':'generated-target-chain',**BASE},
 {'name':'explicit-target-pre-chain',**BASE,'targets':True,'hasPre':True},
 {'name':'use-card-wrapper',**BASE,'wrapper':True},
]


def main():
    oracle=CardEffectChainOracle();fixtures=[{'input':row,'expected':oracle.run_chain(row)} for row in CASES]
    output=ROOT/'tests/synthetic/original-card-effect-chain.json'
    output.write_text(json.dumps({'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{'BattleUnitBase':oracle.assets['BattleUnitBase.lua']['sha256'],'BattleConst':oracle.assets['BattleConst.lua']['sha256']},'scope':'Original ordinary BattleUnitBase UseCard/AppendUseCardEffectChain with explicit card, manager and effect observers across exits and target/pre-command variants. No effect execution, payment, after-use mutation, gameplay or holdout.','fixtures':fixtures},indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Generated',len(fixtures),'original card effect-chain cases')


if __name__=='__main__':main()
