"""Execute original BattleEngine.RunEffectOrder with explicit component adapters."""
import ctypes as C
import json

from command_gate_oracle import CommandGateOracle, ROOT


class EngineRunOrderOracle(CommandGateOracle):
    def __init__(self,asset_overrides=None):
        super().__init__(asset_overrides)
        self.rawequal=self.lib.lua_rawequal;self.rawequal.argtypes=[C.c_void_p,C.c_int,C.c_int];self.rawequal.restype=C.c_int

    def run_order(self,v):
        L=self.state;self.top(L,0);self.errors.clear();trace=[]
        def mark(name,returns=None):
            def callback(s):
                trace.append(name)
                if returns is None:return 0
                self.boolean(s,returns);return 1
            return callback
        self.callback(mark('pre'));self.setglobal(L,b'_run_pre')
        self.callback(lambda s:0);self.setglobal(L,b'_run_finish_func')
        self.table(L,0,1);self.number(L,1);self.setfield(L,-2,b'id');self.setglobal(L,b'_run_finish_target')
        self.table(L,0,1);self.number(L,2);self.setfield(L,-2,b'id');self.setglobal(L,b'_run_finish_data')
        self.table(L,0,3);self.getglobal(L,b'_run_finish_func');self.setfield(L,-2,b'func');self.getglobal(L,b'_run_finish_target');self.setfield(L,-2,b'target');self.getglobal(L,b'_run_finish_data');self.setfield(L,-2,b'data');self.setglobal(L,b'_run_finish')
        self.table(L,0,8)
        def create_order(s):
            checks=[]
            for index,name in ((2,b'_run_finish_func'),(3,b'_run_finish_target'),(4,b'_run_finish_data')):
                self.getglobal(s,name);checks.append(bool(self.rawequal(s,index,-1)));self.top(s,-2)
            trace.append({'event':'createOrder','bindingsPreserved':all(checks)});return 0
        self.method('CreateEffectOrder',create_order)
        for field,name in [('RunRootEffect','runRoot'),('ClearFinishCb','clearFinish'),('AfterEffectOrderFinished','afterFinished')]:self.method(field,mark(name))
        self.method('IsEffectOrderFinished',mark('isOrderFinished',v['orderFinished']));self.setglobal(L,b'_run_effect_mgr')
        self.table(L,0,3)
        for field,name in [('UpdateCardArgs','updateCardArgs'),('CheckHandCardHighlight','checkHighlight'),('ClearNoneDeckCards','clearCards')]:self.method(field,mark(name))
        self.setglobal(L,b'_run_card_mgr')
        self.table(L,0,1);self.method('UpdateStats',mark('playerStats'));self.setglobal(L,b'_run_player_stats')
        self.table(L,0,1);self.getglobal(L,b'_run_player_stats');self.setfield(L,-2,b'battleStats');self.setglobal(L,b'_run_player')
        self.table(L,0,6)
        for field,name in [('UpdateMonsterIntention','updateIntention'),('UpdateSkillArgs','updateSkillArgs'),('UpdateSilverKeyAwakeArgs','updateAwakeArgs'),('UpdateSchoolArgs','updateSchoolArgs')]:self.method(field,mark(name))
        def player(s):trace.append('getPlayer:'+str(int(self.tonumber(s,2,None))));self.getglobal(s,b'_run_player');return 1
        self.method('GetPlayer',player);self.setglobal(L,b'_run_role_mgr')
        self.table(L,0,2);self.method('UpdateStateArgs',mark('updateStateArgs'));self.method('ClearDeletedState',mark('clearStates'));self.setglobal(L,b'_run_state_mgr')
        self.table(L,0,1);self.method('UpdateStats',mark('pveStats'));self.setglobal(L,b'_run_stats_mgr')
        self.table(L,0,1);self.method('EndBout',mark('endBout'));self.setglobal(L,b'_run_bout_mgr')
        self.table(L,0,20)
        for field,global_name in [('effectMgr',b'_run_effect_mgr'),('cardMgr',b'_run_card_mgr'),('roleMgr',b'_run_role_mgr'),('stateMgr',b'_run_state_mgr'),('statsMgr',b'_run_stats_mgr'),('boutMgr',b'_run_bout_mgr')]:self.getglobal(L,global_name);self.setfield(L,-2,field.encode())
        self.table(L,0,1)
        if v['phaseFinish']:
            self.getglobal(L,b'_oracle_bc');self.getfield(L,-1,b'BattlePhase');self.getfield(L,-1,b'Finish');self.setfield(L,-4,b'battlePhase');self.top(L,-3)
        else:self.number(L,-123);self.setfield(L,-2,b'battlePhase')
        self.setfield(L,-2,b'data')
        self.boolean(L,v['pending']);self.setfield(L,-2,b'pendingForceEndBout')
        for field,name in [('BeginRecord','beginRecord'),('EndRecord','endRecord'),('RunBattleEndEffect','runBattleEnd'),('OnBattleFinish','onBattleFinish')]:self.method(field,mark(name))
        self.method('IsBattleFinish',mark('isBattleFinish',v['battleFinish']))
        self.method('IsPVE',mark('isPVE',v['mode']=='pve'))
        self.method('IsPVP',mark('isPVP',v['mode']=='pvp'))
        self.method('CheckIsFinishOrNextWave',mark('checkBattleOver',v['battleOver']))
        self.setglobal(L,b'_run_engine')
        self.getglobal(L,b'_gate_engine_class');self.getfield(L,-1,b'RunEffectOrder');self.getglobal(L,b'_run_engine');self.getglobal(L,b'_run_pre');self.getglobal(L,b'_run_finish');self.boolean(L,v['resume'])
        self.check(self.call(L,4,0,0,0,None))
        self.getglobal(L,b'_run_engine');self.getfield(L,-1,b'pendingForceEndBout');pending=bool(self.tobool(L,-1))
        if self.errors:raise RuntimeError(self.errors)
        return {'trace':trace,'pendingAfter':pending}


CASES=[
 {'name':'pve-complete','resume':False,'battleFinish':False,'battleOver':False,'orderFinished':True,'pending':False,'phaseFinish':False,'mode':'pve'},
 {'name':'resume-incomplete','resume':True,'battleFinish':False,'battleOver':False,'orderFinished':False,'pending':False,'phaseFinish':False,'mode':'pve'},
 {'name':'already-finished','resume':False,'battleFinish':True,'battleOver':False,'orderFinished':False,'pending':True,'phaseFinish':True,'mode':'pve'},
 {'name':'battle-over-complete','resume':False,'battleFinish':False,'battleOver':True,'orderFinished':True,'pending':False,'phaseFinish':False,'mode':'pve'},
 {'name':'force-end-bout','resume':False,'battleFinish':False,'battleOver':False,'orderFinished':True,'pending':True,'phaseFinish':False,'mode':'pve'},
 {'name':'pvp-complete','resume':False,'battleFinish':False,'battleOver':False,'orderFinished':True,'pending':False,'phaseFinish':False,'mode':'pvp'},
 {'name':'battle-over-incomplete','resume':False,'battleFinish':False,'battleOver':True,'orderFinished':False,'pending':True,'phaseFinish':False,'mode':'pve'},
]


def main():
    oracle=EngineRunOrderOracle();fixtures=[{'input':row,'expected':oracle.run_order(row)} for row in CASES]
    output=ROOT/'tests/synthetic/original-engine-run-order.json'
    output.write_text(json.dumps({'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{'BattleEngine':oracle.assets['BattleEngine.lua']['sha256'],'BattleConst':oracle.assets['BattleConst.lua']['sha256']},'scope':'Original BattleEngine.RunEffectOrder with explicit component adapters across resume, finish, wave-end, order-completion, forced-bout and PvE/PvP branches. Component methods are ordered observations; no child effect execution, gameplay or replay transport.','fixtures':fixtures},indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Generated',len(fixtures),'original engine RunEffectOrder cases')


if __name__=='__main__':main()
