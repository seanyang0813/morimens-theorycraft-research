"""Connect original BECreateSkillPhase.DoEffect to original TriggerCmd/GenerateEffectList."""
import json

from trigger_cmd_oracle import TriggerCmdOracle, ROOT


class ConnectedSkillPhaseOracle(TriggerCmdOracle):
    def __init__(self,asset_overrides=None):
        asset_overrides=asset_overrides or {};super().__init__(asset_overrides);L=self.state
        self.table(L,0,2);self.method('DoEffect',lambda s:0);self.setglobal(L,b'_connected_phase_super')
        self.getglobal(L,b'_oracle_config_system')
        def phase_class(s):self.table(s,0,20);self.getglobal(s,b'_connected_phase_super');return 2
        self.method('NewClass',phase_class);self.top(L,0)
        def require(s):
            name=self.string(s,1,None)
            known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.DbgEngine.Effect.BattleEffectServer':b'_connected_phase_super'}
            if name in known:self.getglobal(s,known[name])
            elif name==b'Battle.DbgEngine.Event.BattleLogicEvent':self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('BECreateSkillPhase',asset_overrides.get('BECreateSkillPhase'));self.setglobal(L,b'_connected_phase_class')
        if self.errors:raise RuntimeError(self.errors)

    def run_phase(self,v):
        self.prepare(v);L=self.state;self.top(L,0)
        self.getglobal(L,b'_trigger_self')
        for name in ('SetIsDeleted','GetUpperTargets'):
            self.getglobal(L,b'_oracle_cmd');self.getfield(L,-1,name.encode());self.setfield(L,-3,name.encode());self.top(L,-2)
        self.getfield(L,-1,b'cmdParser');self.table(L,1,0);self.table(L,0,1);self.number(L,55);self.setfield(L,-2,b'token');self.rawset(L,-2,1);self.setfield(L,-2,b'upperTargets');self.top(L,-2)
        def cast_time(s):self.trace.append('GetSkillCastTime');self.number(s,0);return 1
        def before(s):
            self.rawget(s,2,1);self.getfield(s,-1,b'token');self.trace.append(['OnEnterBeforePhase',self.tonumber(s,-1,None)]);return 0
        def timeline(s):self.trace.append(['SendNotAwakerTimeline',bool(self.tobool(s,2))]);return 0
        for name,fn in [('GetSkillCastTime',cast_time),('OnEnterBeforePhase',before),('SendNotAwakerTimeline',timeline)]:self.method(name,fn)
        self.top(L,0);self.getglobal(L,b'_trigger_engine')
        self.method('GetCurPassTime',lambda s:(self.number(s,10),1)[1]);self.method('LogBattleWithTab',lambda s:(self.trace.append('LogBattleWithTab'),0)[1]);self.setglobal(L,b'_trigger_engine')
        self.table(L,0,8)
        for name in ('DoEffect','__FireAfterCreateSkillPhase'):
            self.getglobal(L,b'_connected_phase_class');self.getfield(L,-1,name.encode());self.setfield(L,-3,name.encode());self.top(L,-2)
        self.method('IsTriggerBST',lambda s:(self.boolean(s,False),1)[1])
        self.table(L,0,7);self.getglobal(L,b'_trigger_self');self.setfield(L,-2,b'cmdServer')
        if v['triggerPresent']:self.table(L,0,1);self.number(L,7);self.setfield(L,-2,b'token')
        else:self.nil(L)
        self.setfield(L,-2,b'triggerData');self.boolean(L,v['skipPhase']);self.setfield(L,-2,b'skipPhase');self.boolean(L,v['skipTimeline']);self.setfield(L,-2,b'skipTimeline');self.setfield(L,-2,b'effectConfig')
        self.getglobal(L,b'_trigger_engine');self.setfield(L,-2,b'battleEngine');self.setglobal(L,b'_connected_phase_self')
        self.getglobal(L,b'_connected_phase_self');self.getfield(L,-1,b'DoEffect');self.getglobal(L,b'_connected_phase_self');self.check(self.call(L,1,1,0,0,None));returned=bool(self.tobool(L,-1));self.top(L,0)
        self.getglobal(L,b'_trigger_self');self.getfield(L,-1,b'effectList');effect_count=self.length(L,-1);self.top(L,-2);self.getfield(L,-1,b'isDeleted');deleted=bool(self.tobool(L,-1));self.top(L,0)
        if self.errors:raise RuntimeError(self.errors)
        return {'returned':returned,'trace':self.trace,'preTriggers':self.pre,'effectCount':effect_count,'commandDeleted':deleted}


BASE={'name':'connected','isPreCmd':False,'triggerPresent':True,'skipPhase':False,'skipTimeline':False,'skillPresent':True,'statePresent':False,'perform':'absent','rows':[1,2]}
CASES=[
 {**BASE,'name':'ordinary'},
 {**BASE,'name':'skip-timeline','skipTimeline':True},
 {**BASE,'name':'skip-phase','skipPhase':True,'triggerPresent':False,'perform':'empty'},
 {**BASE,'name':'state-skill','statePresent':True,'perform':'nonempty'},
]


def main():
    oracle=ConnectedSkillPhaseOracle();fixtures=[{'input':row,'expected':oracle.run_phase(row)} for row in CASES]
    output=ROOT/'tests/synthetic/original-connected-skill-phase.json'
    output.write_text(json.dumps({'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{name:oracle.assets[name+'.lua']['sha256'] for name in ('BECreateSkillPhase','BattleCmdServer')},'scope':'Original BECreateSkillPhase.DoEffect connected to original BattleCmdServer.TriggerCmd and GenerateEffectList. Target handoff, timing/timeline hooks, logging, arguments, delays and effect construction are bounded observers; generated effects run only PreTrigger. No target generation, real effect execution, events, finish stage, gameplay or holdout.','fixtures':fixtures},indent=2)+'\n',encoding='utf-8',newline='\n');print('Generated',len(fixtures),'connected original skill-phase cases')


if __name__=='__main__':main()
