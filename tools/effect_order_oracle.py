"""Run original scheduler methods with synthetic effect bodies and manager adapters."""
import ctypes as C
import json
from target_runtime_oracle import TargetOracle, ROOT

class EffectOrderOracle(TargetOracle):
    def __init__(self):
        super().__init__();L=self.state
        self.gettop=self.lib.lua_gettop;self.gettop.argtypes=[C.c_void_p];self.gettop.restype=C.c_int
        self.pushstring=self.lib.lua_pushstring;self.pushstring.argtypes=[C.c_void_p,C.c_char_p];self.pushstring.restype=C.c_void_p
        def require(s):
            name=self.string(s,1,None)
            known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.DbgEngine.Effect.BattleEffectServer':b'_effect_base'}
            if name in known:self.getglobal(s,known[name])
            elif name==b'Battle.Ecs.BattleEntity':self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require')
        self.module('BattleEffectServer');self.setglobal(L,b'_effect_base')
        self.module('BEAttachPostAction');self.setglobal(L,b'_attach_base')
        if self.errors:raise RuntimeError(self.errors)

    def invoke(self,uid,method):
        L=self.state;saved=self.gettop(L);self.getglobal(L,('effect'+str(uid)).encode());self.getfield(L,-1,method.encode());self.pushvalue(L,-2)
        self.check(self.call(L,1,0,0,0,None));self.top(L,saved)

    def run(self,finish_early=False):
        L=self.state;self.top(L,0);self.trace=[];self.deleted=set();self.running=1;self.next_uid=0;self.finished=False;self.remaining=2;self.hit_index=0
        self.table(L,0,10)
        def getobj(s):
            uid=int(self.tonumber(s,2,None))
            if uid and uid not in self.deleted:self.getglobal(s,('effect'+str(uid)).encode())
            else:self.nil(s)
            return 1
        self.method('GetEffectByUid',getobj)
        def running(s):self.getglobal(s,('effect'+str(self.running)).encode());return 1
        self.method('GetRunningEffect',running)
        def setrunning(s):self.getfield(s,2,b'uid');self.running=int(self.tonumber(s,-1,None));self.top(s,-2);return 0
        self.method('SetRunningEffect',setrunning)
        def parent(s):self.number(s,self.running);return 1
        def root(s):self.number(s,1);return 1
        self.method('GetParentEffectUid',parent);self.method('GetRootEffectUid',root)
        def end(s):self.deleted.add(int(self.tonumber(s,2,None)));return 0
        self.method('EffectEnd',end)
        def false(s):self.boolean(s,False);return 1
        def noop(s):return 0
        self.method('IsOverflow',false);self.method('AddRunEffectNum',noop);self.setglobal(L,b'_effect_mgr')
        self.table(L,0,8);self.getglobal(L,b'_effect_mgr');self.setfield(L,-2,b'effectMgr')
        def finished(s):self.boolean(s,self.finished);return 1
        def time(s):self.number(s,0);return 1
        def error(s):self.errors.append(self.string(s,2,None).decode());return 0
        self.method('IsBattleFinish',finished);self.method('GetCurPassTime',time);self.method('AddPassTime',noop);self.method('Error',error)
        self.table(L,0,1);self.table(L,0,0);self.setfield(L,-2,b'BattleApi');self.setfield(L,-2,b'battleDT');self.setglobal(L,b'_effect_engine')
        methods=['PreTrigger','AppendToParentEffect','AddRunningSubEffect','AfterEffect','CheckSubEffectEmpty','RunSubEffect','RunNextMultiEffect','SubEffectEnd','DoMultiEffect','XpcallDoEffect','EffectEnd','RemoveFromParentEffect','GetConfigAfterDelay','GetEffectConfig']
        def create(body,attached=False,multi=False):
            saved=self.gettop(L);self.next_uid+=1;uid=self.next_uid;self.table(L,0,30)
            for method in methods:
                self.getglobal(L,b'_attach_base' if attached and method=='PreTrigger' else b'_effect_base');self.getfield(L,-1,method.encode());self.setfield(L,-3,method.encode());self.top(L,-2)
            self.number(L,uid);self.setfield(L,-2,b'uid');self.getglobal(L,b'_effect_engine');self.setfield(L,-2,b'battleEngine')
            self.table(L,0,0);self.setfield(L,-2,b'subEffectList');self.table(L,0,1);self.pushstring(L,b'Synthetic');self.setfield(L,-2,b'effectType');self.setfield(L,-2,b'effectConfig')
            self.pushstring(L,b'Synthetic');self.setfield(L,-2,b'effectType')
            def eligible(s):self.running=uid;self.boolean(s,True);return 1
            def do(s):body();self.boolean(s,True);return 1
            self.method('TryDoEffect',eligible);self.method('DoEffect',do)
            if multi:
                def repeat(s):
                    self.remaining-=1;self.number(s,self.remaining);self.setfield(s,1,b'leftEffectTimes')
                    self.hit_index+=1;n=self.hit_index
                    def hit():
                        self.trace.append('hit'+str(n))
                        def event():
                            self.trace.append('event'+str(n))
                            def command():
                                self.trace.append('command'+str(n))
                                if finish_early:self.finished=True
                            create(command)
                            create(lambda:self.trace.append('attached'+str(n)),attached=True)
                        create(event)
                    create(hit);self.boolean(s,True);return 1
                self.method('__DoMultiEffect',repeat)
            self.setglobal(L,('effect'+str(uid)).encode());self.top(L,saved)
            if uid!=1:self.invoke(uid,'PreTrigger')
            return uid
        create(lambda:None)
        def start_multi():
            saved=self.gettop(L);self.getglobal(L,b'effect2');self.number(L,2);self.setfield(L,-2,b'leftEffectTimes');self.top(L,saved)
            self.invoke(2,'DoMultiEffect')
        create(start_multi,multi=True)
        create(lambda:self.trace.append('sibling'))
        self.invoke(1,'AfterEffect')
        if self.errors:raise RuntimeError(self.errors)
        return {'trace':self.trace,'battleFinished':self.finished,'executedHits':self.hit_index}

if __name__=='__main__':
    o=EffectOrderOracle()
    fixtures=[{'input':{'finishEarly':flag},'expected':o.run(flag)} for flag in [False,True]]
    assert fixtures[0]['expected']['trace']==['hit1','event1','command1','hit2','event2','command2','sibling','attached1','attached2']
    assert fixtures[1]['expected']['trace']==['hit1','event1','command1']
    out={'scope':'Original PreTrigger, attached-action PreTrigger, child/repetition scheduling and effect completion methods. Synthetic bodies; explicit manager lookups/running effect, always-eligible TryDoEffect, no overflow/yield/retarget, two repetitions. Not full battle execution.','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleEffectServer','BEAttachPostAction']},'fixtures':fixtures}
    (ROOT/'tests/synthetic/original-effect-order.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
    print(json.dumps(fixtures))
