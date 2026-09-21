"""Execute original MonsterBehaviorComp.ChangeSkill and SetIntention boundaries."""
import ctypes as C
import itertools
import json

from phase_transition_effect_oracle import PhaseTransitionEffectOracle, ROOT


class MonsterSkillChangeOracle(PhaseTransitionEffectOracle):
    def __init__(self,module_asset=None):
        super().__init__(); L=self.state
        self.gettop=self.lib.lua_gettop; self.gettop.argtypes=[C.c_void_p]; self.gettop.restype=C.c_int

        @C.CFUNCTYPE(C.c_int,C.c_void_p)
        def command_ctor(state):
            self.trace.append({'event':'constructIntentionCommand'})
            self.table(state,0,2)
            def get_args(inner):
                self.trace.append({'event':'getSkillArgs'}); self.table(inner,0,0); return 1
            self.method('GetSkillArgs',get_args)
            self.method('Dispose',lambda inner:0)
            return 1
        self.command_ctor=command_ctor; self.callbacks.append(command_ctor)

        def require(state):
            name=self.string(state,1,None)
            if name==b'System.System': self.getglobal(state,b'_oracle_config_system')
            elif name==b'Battle.BattleConst': self.getglobal(state,b'_oracle_bc')
            elif name==b'Battle.DbgEngine.Cmd.BattleCmdServer': self.pushclosure(state,self.command_ctor,0)
            else: self.table(state,0,0)
            return 1
        self.callback(require); self.setglobal(L,b'require')
        self.module('MonsterBehaviorComp',module_asset); self.setglobal(L,b'_monster_behavior')

    def scalar(self,index):
        kind=self.kind(self.state,index)
        if kind==0:return None
        if kind==1:return bool(self.tobool(self.state,index))
        if kind==3:return int(self.tonumber(self.state,index,None))
        if kind==4:return self.string(self.state,index,None).decode('utf-8','replace')
        return {'luaType':kind}

    def read_queue(self):
        L=self.state; self.getglobal(L,b'_intent_subject'); self.getfield(L,-1,b'tempSkillList')
        if self.kind(L,-1)==0:self.top(L,0);return None
        result=[]
        for index in range(1,self.rawlen(L,-1)+1):
            self.rawget(L,-1,index)
            if self.kind(L,-1)==5:
                item={}
                for key in (b'intention',b'changeType'):
                    self.getfield(L,-1,key);item[key.decode()]=self.scalar(-1);self.top(L,-2)
                result.append(item)
            else:result.append(self.scalar(-1))
            self.top(L,-2)
        self.top(L,0);return result

    def run_change(self,case):
        L=self.state;self.top(L,0);self.trace=[];self.errors=[]
        state=case['state'];self.table(L,0,5);self.table(L,len(state['tempSkillList']),0)
        for index,item in enumerate(state['tempSkillList'],1):
            self.table(L,0,2);self.number(L,item['intention']);self.setfield(L,-2,b'intention');self.number(L,item['changeType']);self.setfield(L,-2,b'changeType');self.rawseti(L,-2,index)
        self.setfield(L,-2,b'tempSkillList')
        if state['intention'] is not None:self.number(L,state['intention']);self.setfield(L,-2,b'intention')
        self.boolean(L,state['intentionRun']);self.setfield(L,-2,b'intentionRun')
        def set_intention(inner):
            self.trace.append({'event':'setIntention','skillId':int(self.tonumber(inner,2,None))});return 0
        self.method('SetIntention',set_intention);self.setglobal(L,b'_intent_subject')
        self.getglobal(L,b'_monster_behavior');self.getfield(L,-1,b'ChangeSkill');self.getglobal(L,b'_intent_subject');self.number(L,case['skillId']);self.number(L,case['changeType']);self.check(self.call(L,3,1,0,0,None));self.top(L,0)
        if self.errors:raise RuntimeError(self.errors)
        return {'tempSkillList':self.read_queue(),'trace':self.trace}

    def run_set_intention(self,case):
        L=self.state;self.top(L,0);self.trace=[];self.errors=[];self.table(L,0,16)
        if case['previousIntention'] is not None:self.number(L,case['previousIntention']);self.setfield(L,-2,b'intention')
        if case['hasCommand']:
            self.table(L,0,1)
            def dispose(inner):self.trace.append({'event':'disposePreviousIntentionCommand'});return 0
            self.method('Dispose',dispose);self.setfield(L,-2,b'intentionCmdServer')
        self.table(L,0,2);self.number(L,42);self.setfield(L,-2,b'uid')
        def log_name(inner):self.pushstring(inner,b'boss');return 1
        self.method('GetBattleLogName',log_name);self.setfield(L,-2,b'monster')
        def update(inner):self.trace.append({'event':'refreshIntentionDamagePreview'});return 0
        self.method('UpdateIntentionDamage',update)
        def get_cmd(inner):self.trace.append({'event':'resolveIntentionCommand'});self.number(inner,60401);return 1
        self.method('__GetIntentionCmd',get_cmd)
        self.table(L,0,5);self.table(L,0,2);self.table(L,0,1);self.table(L,0,4)
        self.pushstring(L,b'skill-name');self.setfield(L,-2,b'CnID');self.number(L,60401);self.setfield(L,-2,b'CmdList');self.pushstring(L,b'');self.setfield(L,-2,b'Para');self.rawseti(L,-2,case['skillId']);self.setfield(L,-2,b'Skill');self.setfield(L,-2,b'battleDT')
        for method,event in [('CreateEventEffect','emitIntentionChanged'),('LogBattleWithTab','logIntentionChanged')]:
            def observe(inner,event=event):self.trace.append({'event':event});return 0
            self.method(method,observe)
        self.table(L,0,1);self.method('OnMonsterIntenion',lambda inner:0);self.setfield(L,-2,b'recordMgr');self.setfield(L,-2,b'battleEngine');self.setglobal(L,b'_intent_subject')
        self.getglobal(L,b'_monster_behavior');self.getfield(L,-1,b'SetIntention');self.getglobal(L,b'_intent_subject');self.number(L,case['skillId']);self.check(self.call(L,2,1,0,0,None));self.top(L,0)
        fields={}
        for key in (b'lastIntention',b'intention',b'intentionRun'):
            self.getglobal(L,b'_intent_subject');self.getfield(L,-1,key);fields[key.decode()]=self.scalar(-1);self.top(L,0)
        if self.errors:raise RuntimeError(self.errors)
        return {'fields':fields,'trace':self.trace,'executedIntention':any(row['event']=='executeIntention' for row in self.trace)}


def main():
    oracle=MonsterSkillChangeOracle();fixtures=[]
    base_queue=[{'intention':800,'changeType':1}]
    for intention,intention_run,change_type,queued in itertools.product((None,902),(False,True),(0,1),(False,True)):
        case={'state':{'intention':intention,'intentionRun':intention_run,'tempSkillList':base_queue if queued else []},'skillId':60397,'changeType':change_type}
        fixtures.append({'domain':'ChangeSkill','input':case,'expected':oracle.run_change(case)})
    for previous,has_command in itertools.product((None,902),(False,True)):
        case={'previousIntention':previous,'hasCommand':has_command,'skillId':60397}
        fixtures.append({'domain':'SetIntention','input':case,'expected':oracle.run_set_intention(case)})
    output=ROOT/'tests/synthetic/original-monster-skill-change.json'
    report={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{'MonsterBehaviorComp':oracle.assets['MonsterBehaviorComp.lua']['sha256'],'BattleConst':oracle.assets['BattleConst.lua']['sha256']},'scope':'Original MonsterBehaviorComp.ChangeSkill and SetIntention. Covers Substitute/Insert, idle/running/absent prior intention, empty/nonempty temporary queue and old-command disposal. BattleCmdServer construction, skill table, event/log/preview endpoints are explicit observers/adapters. Establishes intent mutation and command construction without ActByIntention execution; no transition skill body, turn advancement, gameplay or holdout credit.','fixtures':fixtures}
    output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print('Generated',len(fixtures),'monster skill-change cases')


if __name__=='__main__':main()
