"""Execute original phase-transition remove-state and monster-skill effects."""
import ctypes as C
import itertools
import json

from state_manager_creation_oracle import StateManagerOracle, ROOT


class PhaseTransitionEffectOracle(StateManagerOracle):
    def __init__(self):
        super().__init__();L=self.state
        self.pushstring=self.lib.lua_pushstring;self.pushstring.argtypes=[C.c_void_p,C.c_char_p];self.pushstring.restype=C.c_char_p
        self.tobool=self.lib.lua_toboolean;self.tobool.argtypes=[C.c_void_p,C.c_int];self.tobool.restype=C.c_int
        def newclass(state):self.table(state,0,24);self.table(state,0,1);self.method('DoEffect',lambda s:0);return 2
        self.getglobal(L,b'_oracle_config_system');self.method('NewClass',newclass);self.top(L,0)
        def require(state):
            name=self.string(state,1,None)
            if name==b'System.System':self.getglobal(state,b'_oracle_config_system')
            elif name==b'Battle.BattleConst':self.getglobal(state,b'_oracle_bc')
            elif name==b'Battle.DbgEngine.Effect.BattleEffectServer':self.table(state,0,0)
            elif name==b'Battle.DbgEngine.Event.BattleLogicEvent':self.table(state,0,1);self.pushstring(state,b'StateRemove');self.setfield(state,-2,b'StateRemove')
            else:self.errors.append(repr(name));self.nil(state)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('BERemoveState');self.setglobal(L,b'_phase_remove_effect');self.module('BEMonsterChangeSkill');self.setglobal(L,b'_phase_skill_effect')
        if self.errors:raise RuntimeError(self.errors)

    def push_array(self,values,writer):
        L=self.state;self.table(L,len(values),0)
        for index,value in enumerate(values,1):writer(value);self.rawseti(L,-2,index)

    def run(self,case):
        L=self.state;self.top(L,0);self.trace=[];self.errors.clear();target_count=case['targets'];state_id=case['stateId']
        self.table(L,0,3);self.table(L,0,target_count)
        for target_index in range(1,target_count+1):
            self.table(L,0,3);self.number(L,target_index);self.setfield(L,-2,b'uid');self.table(L,0,2)
            def change_skill(state,index=target_index):
                self.trace.append({'event':'changeSkill','target':index,'skillId':self.tonumber(state,2,None),'changeType':self.tonumber(state,3,None)});return 0
            self.method('ChangeSkill',change_skill);self.setfield(L,-2,b'monsterBehaviorComp');self.rawseti(L,-2,target_index)
        self.setfield(L,-2,b'targets')
        self.table(L,2,0);self.number(L,case['skillId'] if case['effect']=='skill' else state_id);self.rawseti(L,-2,1);self.number(L,case['changeType'] if case['effect']=='skill' else case['extraRemoveParam']);self.rawseti(L,-2,2);self.setfield(L,-2,b'params')
        self.setglobal(L,b'_phase_effect_self')

        self.getglobal(L,b'_manager_class');self.table(L,0,target_count)
        for target_index in range(1,target_count+1):
            self.table(L,1 if case['stateStatus']!='absent' else 0,0)
            if case['stateStatus']!='absent':
                self.table(L,0,5);self.number(L,target_index*100);self.setfield(L,-2,b'uid');self.number(L,state_id);self.setfield(L,-2,b'stateId');self.boolean(L,case['stateStatus']=='deleted');self.setfield(L,-2,b'isDeleted')
                def life_end(state,index=target_index):
                    self.trace.append({'event':'lifeEnd','target':index,'stateId':state_id});self.boolean(state,True);self.setfield(state,1,b'isDeleted');return 0
                self.method('LifeEnd',life_end);self.rawseti(L,-2,1)
            self.rawseti(L,-2,target_index)
        self.setfield(L,-2,b'ownerUid2StateList')
        self.table(L,0,1)
        def event(state):
            self.trace.append({'event':'stateRemoveEvent'});return 0
        self.method('CreateEventEffect',event);self.setfield(L,-2,b'battleEngine');self.setglobal(L,b'_phase_state_mgr')
        self.getglobal(L,b'_phase_effect_self');self.table(L,0,1);self.getglobal(L,b'_phase_state_mgr');self.setfield(L,-2,b'stateMgr');self.setfield(L,-2,b'battleEngine');self.top(L,0)

        module=b'_phase_skill_effect' if case['effect']=='skill' else b'_phase_remove_effect';self.getglobal(L,module);self.getfield(L,-1,b'DoEffect');self.getglobal(L,b'_phase_effect_self');self.check(self.call(L,1,1,0,0,None));returned=bool(self.tobool(L,-1));self.top(L,0)
        remaining=[]
        for target_index in range(1,target_count+1):
            self.getglobal(L,b'_manager_class');self.getfield(L,-1,b'GetState');self.getglobal(L,b'_phase_state_mgr');self.table(L,0,1);self.number(L,target_index);self.setfield(L,-2,b'uid');self.number(L,state_id);self.check(self.call(L,3,1,0,0,None));remaining.append(self.kind(L,-1)!=0);self.top(L,0)
        if self.errors:raise RuntimeError(self.errors)
        return {'returned':returned,'trace':self.trace,'liveStateAfter':remaining}


def main():
    oracle=PhaseTransitionEffectOracle();fixtures=[]
    for targets,status,state_id,extra in itertools.product((0,1,2),('absent','live','deleted'),(60407,60409),(0,125)):
        case={'effect':'remove','targets':targets,'stateStatus':status,'stateId':state_id,'skillId':60397,'changeType':1,'extraRemoveParam':extra};fixtures.append({'input':case,'expected':oracle.run(case)})
    for targets,skill_id,change_type in itertools.product((0,1,2),(60397,60398),(0,1)):
        case={'effect':'skill','targets':targets,'stateStatus':'absent','stateId':60409,'skillId':skill_id,'changeType':change_type,'extraRemoveParam':0};fixtures.append({'input':case,'expected':oracle.run(case)})
    output=ROOT/'tests/synthetic/original-phase-transition-effects.json'
    output.write_text(json.dumps({'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{name:oracle.assets[name+'.lua']['sha256'] for name in ('BERemoveState','BEMonsterChangeSkill','BattleStateMgrServer')},'scope':'Original BERemoveState.DoEffect connected to original BattleStateMgrServer.GetState/RemoveState and original BEMonsterChangeSkill.DoEffect. Explicit target registry; state LifeEnd and event creation are observers. Covers zero/one/two targets, absent/live/deleted states, both phase skill IDs/change types and extra remove parameters. No original state LifeEnd body, property removal, skill component internals, scheduler, gameplay or holdout credit.','fixtures':fixtures},indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Generated',len(fixtures),'phase-transition effect cases')


if __name__=='__main__':main()
