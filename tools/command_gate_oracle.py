"""Original PvE command entry gate; dispatched card lookup is an observable stop."""
import json,re
from behit_hp_oracle import BeHitHpOracle,ROOT

class CommandGateOracle(BeHitHpOracle):
    def __init__(self):
        super().__init__();L=self.state
        names=set(re.findall(r'require\("([^"]+)"\)',(ROOT/'research/extracted/normalized/BattleEngine.decompiled.lua').read_text(encoding='utf-8')))
        def require(s):
            name=self.string(s,1,None).decode()
            known={'System.System':b'_oracle_config_system','Battle.BattleConst':b'_oracle_bc','Battle.DbgEngine.Event.BattleCommand':b'_gate_commands'}
            if name in known:self.getglobal(s,known[name])
            elif name in names:self.table(s,0,0)
            else:self.errors.append(name);self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('BattleCommand');self.setglobal(L,b'_gate_commands');self.module('BattleEngine');self.setglobal(L,b'_gate_engine_class')

    def run(self,v):
        L=self.state;self.top(L,0);self.lookup=False;self.robot=False;self.flags=[]
        self.table(L,0,12);self.table(L,0,1);self.number(L,v['waitingTimes']);self.setfield(L,-2,b'waitingTimes');self.setfield(L,-2,b'data')
        for name in ['LogBattle','Warn','Info','SendCommand','CommandResult']:self.method(name,lambda s:0)
        self.method('IsPVP',lambda s:(self.boolean(s,False),1)[1]);self.method('IsBattleFinish',lambda s:(self.boolean(s,v['finished']),1)[1])
        def flag(s):self.flags.append(bool(self.tobool(s,2)));return 0
        self.method('SetTimeoutFlag',flag)
        self.table(L,0,1)
        def robot(s):self.robot=True;return 0
        self.method('WaitingCommand',robot);self.setfield(L,-2,b'robotMgr')
        self.table(L,0,4)
        self.method('GetEffectOrderInterrupted',lambda s:(self.pushstring(s,b'synthetic-wait') if v['waiting'] else self.nil(s),1)[1])
        self.method('IsRootEffectOrderExist',lambda s:(self.boolean(s,v['rootExists']),1)[1])
        for name in ['GetRootEffectUid','GetRunningEffectUid']:self.method(name,lambda s:(self.number(s,1),1)[1])
        self.setfield(L,-2,b'effectMgr')
        self.table(L,0,1);self.method('GetCurCamp',lambda s:(self.number(s,2),1)[1]);self.setfield(L,-2,b'boutMgr')
        self.table(L,0,1)
        def lookup(s):self.lookup=True;self.nil(s);return 1
        self.method('GetCardByUid',lookup);self.setfield(L,-2,b'cardMgr');self.setglobal(L,b'_gate_self')
        self.getglobal(L,b'_gate_engine_class');self.getfield(L,-1,b'OnReceiveCommand');self.getglobal(L,b'_gate_self');self.getglobal(L,b'_gate_commands');self.getfield(L,-1,b'lg_UseCard');self.setglobal(L,b'_gate_msg');self.top(L,-2);self.getglobal(L,b'_gate_msg');self.table(L,0,1);self.number(L,7);self.setfield(L,-2,b'cardUid');self.check(self.call(L,3,1,0,0,None))
        returned=None if self.kind(L,-1)==0 else bool(self.tobool(L,-1))
        self.getglobal(L,b'_gate_self');self.getfield(L,-1,b'data');self.getfield(L,-1,b'waitingTimes');count=self.tonumber(L,-1,None)
        if self.errors:raise RuntimeError(self.errors)
        return {'reachedCardLookup':self.lookup,'waitingTimesAfter':count,'robotWaitingCalled':self.robot,'timeoutFlags':self.flags,'returned':returned}

if __name__=='__main__':
    o=CommandGateOracle();fixtures=[]
    for waiting in [False,True]:
        for root in [False,True]:
            for finished in [False,True]:
                for count in [0,3,4]:
                    v={'waiting':waiting,'rootExists':root,'finished':finished,'waitingTimes':count};fixtures.append({'input':v,'expected':o.run(v)})
    report={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original OnReceiveCommand with original command classifications, PvE lg_UseCard; supplied effect state and finished flag. Camp2 avoids play-limit branch, missing-card lookup stops dispatch. Robot/timeout/log/result hooks observed only. No valid card execution, turn advance or gameplay.','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleEngine','BattleCommand']},'fixtures':fixtures}
    (ROOT/'tests/synthetic/original-command-gate.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print('Generated',len(fixtures),'original PvE command gate cases')
