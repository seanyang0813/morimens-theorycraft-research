"""Original phase AfterEffect with original command cleanup and scheduler spies."""
import json
from behit_hp_oracle import BeHitHpOracle, ROOT
class PhaseFinishOracle(BeHitHpOracle):
    def __init__(self,asset_overrides=None):
        asset_overrides=asset_overrides or {};super().__init__(asset_overrides);L=self.state
        self.table(L,0,1)
        def base_do(s):return 0
        self.method('DoEffect',base_do);self.setglobal(L,b'_phase_super')
        self.getglobal(L,b'_oracle_config_system')
        def phase_class(s):self.table(s,0,20);self.getglobal(s,b'_phase_super');return 2
        self.method('NewClass',phase_class);self.top(L,0)
        def require(s):
            name=self.string(s,1,None)
            known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc'}
            if name in known:self.getglobal(s,known[name])
            elif name==b'Battle.DbgEngine.Effect.BattleEffectServer':self.getglobal(s,b'_phase_super')
            elif name==b'Battle.DbgEngine.Event.BattleLogicEvent':self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require')
        self.module('BECreateSkillPhase',asset_overrides.get('BECreateSkillPhase'));self.setglobal(L,b'_phase_original')
        if self.errors:raise RuntimeError(self.errors)
    def run_finish(self,v):
        L=self.state;self.top(L,0);self.trace=[]
        self.table(L,0,7)
        for name in ['OnEnterFinishPhase','SetIsDeleted','ClearStats']:
            self.getglobal(L,b'_oracle_cmd');self.getfield(L,-1,name.encode());self.setfield(L,-3,name.encode());self.top(L,-2)
        self.boolean(L,v['deleted']);self.setfield(L,-2,b'isDeleted')
        self.table(L,0,1);self.number(L,7);self.setfield(L,-2,b'target');self.setfield(L,-2,b'upperTargets')
        self.table(L,0,1);self.table(L,0,1);self.number(L,9);self.setfield(L,-2,b'target');self.setfield(L,-2,b'upperTargets');self.setfield(L,-2,b'cmdParser')
        self.table(L,0,1);self.number(L,200);self.setfield(L,-2,b'damage');self.setfield(L,-2,b'stats')
        self.setglobal(L,b'_phase_cmd')
        self.table(L,0,5);self.getglobal(L,b'_phase_cmd');self.setfield(L,-2,b'processingCmd')
        def empty(s):self.boolean(s,self.empty);return 1
        def finish(s):self.trace.append('SkillCmdFinish');return 0
        def run(s):self.trace.append('RunSubEffect');self.boolean(s,True);return 1
        def end(s):self.trace.append('EffectEnd');self.boolean(s,False);return 1
        self.method('CheckSubEffectEmpty',empty);self.method('__FireSkillCmdFinish',finish);self.method('RunSubEffect',run);self.method('EffectEnd',end)
        self.setglobal(L,b'_phase_self')
        snapshots=[]
        for self.empty in v['emptySequence']:
            self.getglobal(L,b'_phase_original');self.getfield(L,-1,b'AfterEffect');self.getglobal(L,b'_phase_self');self.check(self.call(L,1,1,0,0,None))
            returned=bool(self.tobool(L,-1));self.top(L,0)
            self.getglobal(L,b'_phase_cmd');self.getfield(L,-1,b'isDeleted');deleted=bool(self.tobool(L,-1));self.top(L,-2)
            missing=[]
            for table,key in [('upperTargets','target'),('stats','damage')]:
                self.getfield(L,-1,table.encode());self.getfield(L,-1,key.encode());missing.append(self.kind(L,-1)==0);self.top(L,-3)
            self.getfield(L,-1,b'cmdParser');self.getfield(L,-1,b'upperTargets');self.getfield(L,-1,b'target');parser_target=self.tonumber(L,-1,None)
            self.top(L,0);snapshots.append(dict(returned=returned,deleted=deleted,targetsCleared=missing[0],statsCleared=missing[1],parserTarget=parser_target))
        return dict(trace=self.trace,snapshots=snapshots)
if __name__=='__main__':
    o=PhaseFinishOracle();cases=[dict(deleted=False,emptySequence=[False,True,True]),dict(deleted=True,emptySequence=[False,True]),dict(deleted=False,emptySequence=[True]),dict(deleted=True,emptySequence=[True])]
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original phase AfterEffect plus original command OnEnterFinishPhase/SetIsDeleted/ClearStats; child-empty sequence explicit, event/RunSubEffect/EffectEnd observed rather than executed. No full phase scheduler or gameplay validation.','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BECreateSkillPhase','BattleCmdServer']},'fixtures':[{'input':v,'expected':o.run_finish(v)} for v in cases]}
    (ROOT/'tests/synthetic/original-skill-phase-finish.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(cases),'original phase finish sequences')
