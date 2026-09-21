"""Execute original BEAfterUseCard lifecycle with explicit adapters."""
import ctypes as C
import json

from target_runtime_oracle import TargetOracle, ROOT


class AfterUseCardOracle(TargetOracle):
    def __init__(self,asset_overrides=None):
        asset_overrides=asset_overrides or {};super().__init__(asset_overrides);L=self.state
        self.kind=self.lib.lua_type;self.kind.argtypes=[C.c_void_p,C.c_int];self.kind.restype=C.c_int
        self.tobool=self.lib.lua_toboolean;self.tobool.argtypes=[C.c_void_p,C.c_int];self.tobool.restype=C.c_int
        self.pushstring=self.lib.lua_pushstring;self.pushstring.argtypes=[C.c_void_p,C.c_char_p]
        self.rawgeti=self.lib.lua_rawgeti;self.rawgeti.argtypes=[C.c_void_p,C.c_int,C.c_int64];self.rawgeti.restype=C.c_int
        self.rawseti=self.lib.lua_rawseti;self.rawseti.argtypes=[C.c_void_p,C.c_int,C.c_int64]
        self.absindex=self.lib.lua_absindex;self.absindex.argtypes=[C.c_void_p,C.c_int];self.absindex.restype=C.c_int
        self.module('BattleLogicEvent',asset_overrides.get('BattleLogicEvent'));self.setglobal(L,b'_after_logic')
        self.module('BattleRenderEvent',asset_overrides.get('BattleRenderEvent'));self.setglobal(L,b'_after_render')
        self.table(L,0,4)
        for name in ('ctor','Dispose','DoEffect','EffectEnd'):self.method(name,lambda s:0)
        self.setglobal(L,b'_after_super')
        def new_class(s):self.table(s,0,100);self.getglobal(s,b'_after_super');return 2
        self.getglobal(L,b'_oracle_config_system');self.method('NewClass',new_class);self.top(L,0)
        known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.DbgEngine.Event.BattleLogicEvent':b'_after_logic',b'Battle.DbgEngine.Event.BattleRenderEvent':b'_after_render',b'Battle.DbgEngine.Effect.BattleEffectServer':b'_after_super'}
        def require(s):
            name=self.string(s,1,None)
            if name in known:self.getglobal(s,known[name])
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('BEAfterUseCard',asset_overrides.get('BEAfterUseCard'));self.setglobal(L,b'_after_class')
        if self.errors:raise RuntimeError(self.errors)

    def _field(self,L,index,name):
        index=self.absindex(L,index);self.getfield(L,index,name.encode());kind=self.kind(L,-1)
        value=None if kind==0 else bool(self.tobool(L,-1)) if kind==1 else self.tonumber(L,-1,None) if kind==3 else self.string(L,-1,None).decode() if kind==4 else '<table>'
        self.top(L,-2);return value

    def _value(self,L,index):
        kind=self.kind(L,index)
        return None if kind==0 else bool(self.tobool(L,index)) if kind==1 else self.tonumber(L,index,None) if kind==3 else self.string(L,index,None).decode() if kind==4 else '<table>'

    def run_after(self,v):
        L=self.state;self.top(L,0);self.errors.clear();trace=[];events=[];stats=[]
        self.table(L,0,4);self.number(L,700);self.setfield(L,-2,b'uid')
        self.method('GetStats',lambda s:(self.table(s,1,0),self.number(s,v['usedCount']),self.rawseti(s,-2,600),1)[3])
        def add_stats(s):
            key=self.string(s,2,None).decode() if self.kind(s,2)==4 else str(self.tonumber(s,2,None));kind=self.kind(s,3)
            if kind==5:self.rawgeti(s,3,600);value=self.tonumber(s,-1,None);self.top(s,-2)
            else:value=self.tonumber(s,3,None)
            stats.append({'key':key,'value':value});return 0
        self.method('AddStats',add_stats);self.setglobal(L,b'_after_cmd')
        self.table(L,0,10);self.number(L,600);self.setfield(L,-2,b'tid')
        self.getglobal(L,b'_after_cmd');self.setfield(L,-2,b'cmdServer');self.table(L,0,1);self.number(L,600);self.setfield(L,-2,b'tid');self.setfield(L,-2,b'data')
        self.method('ClearCmdServerStats',lambda s:(trace.append('clearStats'),0)[1]);self.method('GetProperty',lambda s:(self.number(s,v['consume']),1)[1])
        def match(s):
            kind=self.string(s,2,None);self.boolean(s,(kind==b'Card_Awake' and v['awake']) or (kind==b'Card_Strike' and v['strike']));return 1
        self.method('CardTypeMatch',match);self.method('IsFromAttachPost',lambda s:(self.boolean(s,v['attached']),1)[1]);self.method('GetOwnerUid',lambda s:(self.number(s,9),1)[1]);self.method('ClearDamageTargets',lambda s:(trace.append('clearTargets'),0)[1]);self.setglobal(L,b'_after_card')
        self.table(L,0,1);self.method('OnAfterUseCard',lambda s:(trace.append('record:'+str(self._value(s,3))),0)[1]);self.setglobal(L,b'_after_record_mgr')
        self.table(L,0,1)
        def move(s):trace.append('move:'+str(self._field(s,3,'targetDeck')));return 0
        self.method('MoveCardToDeck',move);self.setglobal(L,b'_after_card_mgr')
        self.table(L,0,1);self.method('AfterAction',lambda s:(trace.append('afterAction:'+str(self._field(s,2,'missing')) if self.kind(s,2)==5 else 'afterAction:'+str(self.string(s,2,None).decode() if self.kind(s,2)==4 else self.tonumber(s,2,None))),0)[1]);self.setglobal(L,b'_after_role_mgr')
        self.table(L,0,10);self.method('GetObj',lambda s:(self.getglobal(s,b'_after_card'),1)[1] if v['hasCard'] else (self.nil(s),1)[1])
        for field,name in [('recordMgr',b'_after_record_mgr'),('cardMgr',b'_after_card_mgr'),('roleMgr',b'_after_role_mgr')]:self.getglobal(L,name);self.setfield(L,-2,field.encode())
        def create_event(s):
            data=self.absindex(s,3);executor=self._field(s,data,'executorUid');events.append({'eventId':self.tonumber(s,2,None),'kind':'attach' if executor is not None else 'after','deck':self._field(s,data,'deck'),'executorUid':executor,'skillTid':self._field(s,data,'skillTid')});trace.append('event:'+events[-1]['kind']);return 0
        self.method('CreateEventEffect',create_event);self.method('SetCurCard',lambda s:(trace.append('clearCurCard'),0)[1]);self.setglobal(L,b'_after_engine')
        self.table(L,0,10);self.table(L,0,4);self.number(L,500);self.setfield(L,-2,b'cardUid');self.number(L,9);self.setfield(L,-2,b'castRoleUid');self.number(L,1);self.setfield(L,-2,b'camp')
        if v['targetDeck'] is not None:self.number(L,v['targetDeck']);self.setfield(L,-2,b'TargetCardDeck')
        self.setfield(L,-2,b'effectConfig');self.getglobal(L,b'_after_engine');self.setfield(L,-2,b'battleEngine')
        if v['hasEffectCmd']:self.getglobal(L,b'_after_cmd');self.setfield(L,-2,b'cmdServer')
        self.method('IsTriggerBST',lambda s:(self.boolean(s,v['trigger']),1)[1])
        for name in ('DoEffect','__FireAfterUseCard','__SendAfterAttachPostAction','EffectEnd'):
            self.getglobal(L,b'_after_class');self.getfield(L,-1,name.encode());self.setfield(L,-3,name.encode());self.top(L,-2)
        self.setglobal(L,b'_after_self')
        self.getglobal(L,b'_after_self');self.getfield(L,-1,b'DoEffect');self.getglobal(L,b'_after_self');self.check(self.call(L,1,1,0,0,None));returned=None if self.kind(L,-1)==0 else bool(self.tobool(L,-1));self.top(L,0)
        if v['effectEnd']:
            self.getglobal(L,b'_after_self');self.getfield(L,-1,b'EffectEnd');self.getglobal(L,b'_after_self');self.check(self.call(L,1,0,0,0,None))
        if self.errors:raise RuntimeError(self.errors)
        return {'returned':returned,'trace':trace,'events':events,'stats':stats}


BASE={'hasCard':True,'targetDeck':None,'awake':False,'consume':0,'attached':False,'strike':False,'hasEffectCmd':False,'usedCount':0,'trigger':True,'effectEnd':False}
CASES=[
 {'name':'missing-card',**BASE,'hasCard':False},
 {'name':'explicit-deck',**BASE,'targetDeck':99},
 {'name':'awake-deck',**BASE,'awake':True},
 {'name':'consumed-deck',**BASE,'consume':1},
 {'name':'attached-deck-events',**BASE,'attached':True},
 {'name':'grave-no-trigger',**BASE,'trigger':False},
 {'name':'strike-stats',**BASE,'strike':True,'hasEffectCmd':True,'usedCount':2},
 {'name':'effect-end',**BASE,'effectEnd':True},
]


def main():
    oracle=AfterUseCardOracle();fixtures=[{'input':row,'expected':oracle.run_after(row)} for row in CASES]
    output=ROOT/'tests/synthetic/original-after-use-card.json'
    output.write_text(json.dumps({'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{name:oracle.assets[name+'.lua']['sha256'] for name in ('BEAfterUseCard','BattleConst','BattleLogicEvent','BattleRenderEvent')},'scope':'Original BEAfterUseCard DoEffect/EffectEnd with explicit card, manager, stats and event observers across deck, trigger, attached and cleanup branches. No event listeners, card-manager mutation internals, gameplay or holdout.','fixtures':fixtures},indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Generated',len(fixtures),'original after-use card cases')


if __name__=='__main__':main()
