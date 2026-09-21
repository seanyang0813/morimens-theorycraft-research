"""Execute original BattleEngine.lg_UseCard across dispatch branches."""
import ctypes as C
import json

from command_gate_oracle import CommandGateOracle, ROOT


class EngineUseCardOracle(CommandGateOracle):
    def __init__(self,asset_overrides=None):
        super().__init__(asset_overrides);L=self.state
        self.rawequal=self.lib.lua_rawequal;self.rawequal.argtypes=[C.c_void_p,C.c_int,C.c_int];self.rawequal.restype=C.c_int
        self.absindex=self.lib.lua_absindex;self.absindex.argtypes=[C.c_void_p,C.c_int];self.absindex.restype=C.c_int
        self.getglobal(L,b'table');self.method('tostring',lambda s:(self.pushstring(s,b'[]'),1)[1]);self.top(L,0)
        self.enums={name:self._enum(group,key) for name,group,key in [('camp1','BattleCamp','Camp1'),('client','PVPTargetModel','Client'),('notInHand','CardFailedReason','NotInHand')]}

    def _enum(self,group,key):
        L=self.state;self.getglobal(L,b'_oracle_bc');self.getfield(L,-1,group.encode());self.getfield(L,-1,key.encode());value=self.tonumber(L,-1,None);self.top(L,0);return value

    def _identity(self,L,index):
        index=self.absindex(L,index)
        if self.kind(L,index)==0:return None
        for label,name in [('original',b'_use_targets'),('replacement',b'_use_replacement'),('hand',b'_use_hand')]:
            self.getglobal(L,name);same=bool(self.rawequal(L,index,-1));self.top(L,-2)
            if same:return label
        return 'other'

    def run_use(self,v):
        L=self.state;self.top(L,0);self.errors.clear();trace=[];can_args=[];results=[]
        for name,marker in [('_use_targets',1),('_use_replacement',2),('_use_hand',3)]:self.table(L,0,1);self.number(L,marker);self.setfield(L,-2,b'marker');self.setglobal(L,name.encode())
        self.table(L,0,4)
        self.method('GetCurCamp',lambda s:(self.number(s,self.enums['camp1'] if v['camp1'] else 2),1)[1])
        self.method('GetBoutNum',lambda s:(self.number(s,6),1)[1]);self.setglobal(L,b'_use_bout')
        self.table(L,0,1);self.method('GetCurBoutStats',lambda s:(self.number(s,v['usedCount']),1)[1]);self.setglobal(L,b'_use_stats')
        self.table(L,0,1);self.method('GetConstant',lambda s:(self.number(s,v['maxPlay']),1)[1]);self.setglobal(L,b'_use_dt')
        self.table(L,0,1);self.method('GetTargetModel',lambda s:(self.number(s,self.enums['client'] if v['clientTarget'] else -99),1)[1]);self.setglobal(L,b'_use_gameplay')
        self.table(L,0,1);self.method('GetCardCmdServer',lambda s:(self.table(s,0,0),1)[1]);self.setglobal(L,b'_use_card_object')
        self.table(L,0,4)
        def replace(s):
            trace.append('replaceTargets:'+str(self._identity(s,3)))
            if v['replaceTargets']:self.getglobal(s,b'_use_replacement')
            else:self.nil(s)
            return 1
        self.method('ReplaceClientTarget',replace)
        def can_use(s):
            can_args.append({'targets':self._identity(s,3),'replacement':self._identity(s,4)});self.boolean(s,v['canUse']);self.number(s,77);return 2
        self.method('CanUseCard',can_use)
        def use(s):trace.append('useCard:'+str(self._identity(s,3)));return 0
        self.method('UseCard',use);self.setglobal(L,b'_use_owner')
        self.table(L,0,4);self.number(L,500);self.setfield(L,-2,b'uid');self.number(L,600);self.setfield(L,-2,b'tid');self.number(L,4);self.setfield(L,-2,b'deck');self.getglobal(L,b'_use_owner');self.setfield(L,-2,b'owner');self.setglobal(L,b'_use_card_data')
        self.table(L,0,2)
        def get_card(s):
            if v['hasCard']:self.getglobal(s,b'_use_card_data')
            else:self.nil(s)
            return 1
        self.method('GetCardByUid',get_card);self.method('GetHandCardUidList',lambda s:(self.getglobal(s,b'_use_hand'),1)[1]);self.setglobal(L,b'_use_card_mgr')
        self.table(L,0,16)
        for field,name in [('boutMgr',b'_use_bout'),('statsMgr',b'_use_stats'),('battleDT',b'_use_dt'),('gameplay',b'_use_gameplay'),('cardMgr',b'_use_card_mgr')]:self.getglobal(L,name);self.setfield(L,-2,field.encode())
        for name in ('Warn','Info'):self.method(name,lambda s:0)
        self.method('GetObj',lambda s:(self.getglobal(s,b'_use_card_object'),1)[1] if v['cardObject'] else (self.nil(s),1)[1])
        def command_result(s):
            self.getfield(s,2,b'targetUids');targets=self._identity(s,-1);self.top(s,-2)
            self.getfield(s,2,b'newDeck');deck=None if self.kind(s,-1)==0 else self.tonumber(s,-1,None);self.top(s,-2)
            self.getfield(s,2,b'handCardList');hand=self._identity(s,-1);self.top(s,-2)
            results.append({'ret':bool(self.tobool(s,3)),'targets':targets,'newDeck':deck,'hand':hand});return 0
        self.method('CommandResult',command_result)
        self.method('lg_BoutEnd',lambda s:(trace.append('forcedBoutEnd'),self.boolean(s,True),1)[2]);self.setglobal(L,b'_use_engine')
        self.table(L,0,4);self.number(L,500);self.setfield(L,-2,b'cardUid');self.number(L,9);self.setfield(L,-2,b'playerId');self.getglobal(L,b'_use_targets');self.setfield(L,-2,b'targetUids');self.setglobal(L,b'_use_msg')
        self.getglobal(L,b'_gate_engine_class');self.getfield(L,-1,b'lg_UseCard');self.getglobal(L,b'_use_engine');self.getglobal(L,b'_use_msg');self.check(self.call(L,2,2,0,0,None))
        second=None if self.kind(L,-1)==0 else self.tonumber(L,-1,None);first=None if self.kind(L,-2)==0 else bool(self.tobool(L,-2));self.top(L,0)
        self.getglobal(L,b'_use_msg');self.getfield(L,-1,b'targetUids');final_targets=self._identity(L,-1)
        if self.errors:raise RuntimeError(self.errors)
        return {'return':[first,second],'trace':trace,'canUseArgs':can_args,'commandResults':results,'finalTargets':final_targets}


BASE={'camp1':False,'usedCount':0,'maxPlay':299,'hasCard':True,'clientTarget':False,'cardObject':False,'replaceTargets':False,'canUse':True}
CASES=[
 {'name':'missing-card',**BASE,'hasCard':False},
 {'name':'server-target-success',**BASE},
 {'name':'server-target-denied',**BASE,'canUse':False},
 {'name':'client-no-object',**BASE,'clientTarget':True},
 {'name':'client-replaced',**BASE,'clientTarget':True,'cardObject':True,'replaceTargets':True},
 {'name':'camp1-play-limit',**BASE,'camp1':True,'usedCount':299},
]


def main():
    oracle=EngineUseCardOracle();fixtures=[{'input':row,'expected':oracle.run_use(row)} for row in CASES]
    output=ROOT/'tests/synthetic/original-engine-use-card.json'
    output.write_text(json.dumps({'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{'BattleEngine':oracle.assets['BattleEngine.lua']['sha256'],'BattleConst':oracle.assets['BattleConst.lua']['sha256']},'scope':'Original BattleEngine.lg_UseCard across missing, denied, successful, client-target replacement and per-turn-limit branches. Card/player methods and CommandResult are explicit observers; no payment, effect execution, HP, gameplay or network send.','fixtures':fixtures},indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Generated',len(fixtures),'original engine use-card cases')


if __name__=='__main__':main()
