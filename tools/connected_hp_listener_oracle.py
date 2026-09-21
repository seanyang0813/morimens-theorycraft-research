"""Connect RoleHpChanged event delivery to original HP-listener eligibility and trigger."""
import ctypes as C
import json

from connected_event_listener_oracle import ConnectedEventListenerOracle, ROOT


class ConnectedHpListenerOracle(ConnectedEventListenerOracle):
    def __init__(self, asset_overrides=None):
        asset_overrides = asset_overrides or {}
        super().__init__(asset_overrides)
        L = self.state
        self.length = self.lib.lua_rawlen
        self.length.argtypes = [C.c_void_p, C.c_int]
        self.length.restype = C.c_size_t
        self.rawset = self.lib.lua_rawseti
        self.rawset.argtypes = [C.c_void_p, C.c_int, C.c_longlong]
        self.rawset.restype = None
        self.gettop = self.lib.lua_gettop
        self.gettop.argtypes = [C.c_void_p]
        self.gettop.restype = C.c_int
        self.integer=self.lib.lua_pushinteger;self.integer.argtypes=[C.c_void_p,C.c_longlong];self.integer.restype=None

        self.table(L, 0, 1)
        self.method('ctor', lambda s: 0)
        self.setglobal(L, b'_hp_trigger_super')

        def base_new_class(s):
            self.table(s, 0, 20)
            self.getglobal(s, b'_hp_trigger_super')
            return 2

        self.getglobal(L, b'_oracle_config_system')
        self.method('NewClass', base_new_class)
        self.top(L, 0)

        def trigger_require(s):
            name = self.string(s, 1, None)
            if name == b'System.System':
                self.getglobal(s, b'_oracle_config_system')
            elif name == b'Battle.BattleConst':
                self.getglobal(s, b'_oracle_bc')
            elif name == b'Battle.DbgEngine.Card.BattleCardServer':
                self.table(s, 0, 0)
            else:
                self.errors.append('Unexpected state-trigger dependency: ' + repr(name))
                self.nil(s)
            return 1

        self.callback(trigger_require)
        self.setglobal(L, b'require')
        self.module('BattleStateTriggerServer', asset_overrides.get('BattleStateTriggerServer'))
        self.setglobal(L, b'_hp_trigger_base')

        def hp_new_class(s):
            self.table(s, 0, 8)
            self.getglobal(s, b'_hp_trigger_base')
            return 2

        self.getglobal(L, b'_oracle_config_system')
        self.method('NewClass', hp_new_class)
        self.top(L, 0)

        def hp_require(s):
            name = self.string(s, 1, None)
            known = {
                b'System.System': b'_oracle_config_system',
                b'Battle.BattleConst': b'_oracle_bc',
                b'Battle.DbgEngine.State.Trigger.BattleStateTriggerServer': b'_hp_trigger_base',
                b'Battle.DbgEngine.Event.BattleLogicEvent': b'_connected_logic_events',
            }
            if name in known:
                self.getglobal(s, known[name])
            else:
                self.errors.append('Unexpected HP-listener dependency: ' + repr(name))
                self.nil(s)
            return 1


        self.callback(hp_require)
        self.setglobal(L, b'require')
        self.module('BSTHpChanged', asset_overrides.get('BSTHpChanged'))
        self.setglobal(L, b'_hp_listener_class')

        self.getglobal(L, b'_oracle_config_system')
        self.method('NewClass', base_new_class)
        self.top(L, 0)
        def state_require(s):
            name=self.string(s,1,None)
            known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.DbgEngine.Cmd.BattleCmdServer':b'_oracle_cmd',b'Battle.DbgEngine.Event.BattleLogicEvent':b'_connected_logic_events'}
            if name in known:self.getglobal(s,known[name])
            elif name in (b'Battle.Ecs.BattleEntity',b'Battle.DbgEngine.Card.BattleCardServer',b'Battle.DbgEngine.Cmd.BattleCmdParser',b'Battle.DbgEngine.DataCenter.BattleStateData'):self.getglobal(s,b'_hp_trigger_super')
            else:self.errors.append('Unexpected state dependency: '+repr(name));self.nil(s)
            return 1
        self.callback(state_require);self.setglobal(L,b'require');self.module('BattleStateServer',asset_overrides.get('BattleStateServer'));self.setglobal(L,b'_hp_state_class')

        def generated_new_class(s):self.table(s,0,20);self.getglobal(s,b'_connected_effect_base');return 2
        self.getglobal(L,b'_oracle_config_system');self.method('NewClass',generated_new_class);self.top(L,0)
        def generated_require(s):
            name=self.string(s,1,None);known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.Util.BattleUtilServer':b'_oracle_util',b'Battle.DbgEngine.Effect.BattleEffectServer':b'_connected_effect_base',b'Battle.DbgEngine.Event.BattleLogicEvent':b'_connected_logic_events'}
            if name in known:self.getglobal(s,known[name])
            else:self.errors.append('Unexpected generated-effect dependency: '+repr(name));self.nil(s)
            return 1
        self.callback(generated_require);self.setglobal(L,b'require');self.module('BEGenerateTargets',asset_overrides.get('BEGenerateTargets'));self.setglobal(L,b'_hp_generate_class');self.module('BECreateSkillPhase',asset_overrides.get('BECreateSkillPhase'));self.setglobal(L,b'_hp_phase_class')

        self.state_effect_ctor_cb=C.CFUNCTYPE(C.c_int,C.c_void_p)(self._construct_state_effect);self.callbacks.append(self.state_effect_ctor_cb)
        def runtime_require(s):
            name = self.string(s, 1, None)
            if name == b'Battle.DbgEngine.Effect.BESendEvent':
                self.pushclosure(s, self.send_ctor_cb, 0)
            elif name in (b'Battle.DbgEngine.Effect.BEGenerateTargets',b'Battle.DbgEngine.Effect.BECreateSkillPhase'):
                self.pushclosure(s,self.state_effect_ctor_cb,0)
            else:
                self.errors.append('Unexpected runtime dependency: ' + repr(name))
                self.nil(s)
            return 1

        self.callback(runtime_require)
        self.setglobal(L, b'require')
        if self.errors:
            raise RuntimeError(self.errors)

    def _construct_send_effect(self,s):
        if hasattr(self,'stateEndEvents'):
            self.getfield(s,2,b'eventData')
            if self.kind(s,-1)==5:
                self.getfield(s,-1,b'stateUid')
                if self.kind(s,-1)==3:self.stateEndEvents.append({'stateUid':self.tonumber(s,-1,None)})
            self.top(s,2)
        return super()._construct_send_effect(s)

    def _construct_state_effect(self,s):
        row={}
        for name in ('effectType','targetType','castRoleUid'):
            self.getfield(s,2,name.encode())
            if self.kind(s,-1)==3:row[name]=self.tonumber(s,-1,None)
            elif self.kind(s,-1)==4:row[name]=self.string(s,-1,None).decode()
            self.top(s,-2)
        self.getfield(s,2,b'triggerData')
        if self.kind(s,-1)==5:
            self.getfield(s,-1,b'triggerValue');row['triggerValue']=self.tonumber(s,-1,None);self.top(s,-2)
            self.getfield(s,-1,b'associator');self.rawget(s,-1,1);self.getglobal(s,b'_hp_caster');row['sameAssociator']=bool(self.rawequal(s,-2,-1));self.top(s,2)
        else:self.top(s,2)
        self.stateEffectConfigs.append(row)
        if not getattr(self,'executeGenerated',False):self.table(s,0,1);self.method('PreTrigger',lambda state:0);return 1
        effect_type=row.get('effectType');source=b'_hp_generate_class' if effect_type=='BEGenerateTargets' else b'_hp_phase_class';target=b'_hp_generated_target_effect' if effect_type=='BEGenerateTargets' else b'_hp_generated_phase_effect'
        self.pushvalue(s,1);self.setglobal(s,b'_hp_generated_engine_arg');self.pushvalue(s,2);self.setglobal(s,b'_hp_generated_config_arg');self.table(s,0,50)
        self._copy(s,b'_connected_effect_base',('PreTrigger','AppendToParentEffect','TryDoEffect','CheckCondition','GenTargets','GenParams','PlayEffectSfx','GetConfigBeforeDelay'))
        self.method('CheckCondition',lambda state:(self.boolean(state,True),1)[1])
        names=('DoEffect',) if effect_type=='BEGenerateTargets' else ('DoEffect','__FireAfterCreateSkillPhase')
        self._copy(s,source,names);self.method('IsTriggerBST',lambda state:(self.boolean(state,False),1)[1]);self.setglobal(s,target)
        self.getglobal(s,source);self.getfield(s,-1,b'ctor');self.getglobal(s,target);self.getglobal(s,b'_hp_generated_engine_arg');self.getglobal(s,b'_hp_generated_config_arg');self.check(self.call(s,3,0,0,0,None));self.top(s,0);self.getglobal(s,target);return 1

    def run_hp_listener(self, values):
        # Reuse the already tested core setup, then install the real HP listener.
        self.stateEndEvents=[]
        self.executeGenerated=bool(values.get('executeGenerated'))
        self.run_connected({'autoBattle': False, 'explicitAuto': None, 'token': -1})
        L = self.state
        self.top(L, 0)
        self.errors.clear()
        triggered = []
        self.stateEffectConfigs=[]
        dispatch_errors=[]
        state_trace=[]

        self.getglobal(L, b'_connected_event_mgr')
        self.table(L, 0, 0)
        self.setfield(L, -2, b'eventData')
        self.table(L,0,1)
        def dispatch_error(s):
            top=self.gettop(s);value=self.string(s,top,None);dispatch_errors.append(value.decode() if value else 'unknown dispatch error');return 0
        self.method('Error',dispatch_error);self.setfield(L,-2,b'entity')
        self.top(L, 0)

        self.table(L, 0, 5)
        self.number(L, values['ownerUid'])
        self.setfield(L, -2, b'uid')
        self.method('GetCamp', lambda s: (self.number(s, values['ownerCamp']), 1)[1])
        self.method('GetProperty',lambda s:(state_trace.append('GetProperty'),self.number(s,values.get('hidden',0)),1)[2])
        self.method('is',lambda s:(state_trace.append('is'),self.boolean(s,False),1)[2])
        self.method('IsDead',lambda s:(state_trace.append('IsDead'),self.boolean(s,values.get('dead',False)),1)[2])
        def is_role_type(s):
            self.boolean(s, values['ownerType'] == 'monster')
            return 1
        self.method('IsRoleType', is_role_type)
        self.method('GetBattleLogName', lambda s: (self.pushstring(s, b'owner'), 1)[1])
        self.setglobal(L, b'_hp_owner')

        self.table(L, 0, 3)
        self.number(L, values['targetUid'])
        self.setfield(L, -2, b'uid')
        self.method('GetCamp', lambda s: (self.number(s, values['targetCamp']), 1)[1])
        self.setglobal(L, b'_hp_target')
        self.table(L, 0, 1)
        self.number(L, values['casterUid'])
        self.setfield(L, -2, b'uid')
        self.setglobal(L, b'_hp_caster')

        self.getglobal(L, b'_connected_engine')
        self.getglobal(L, b'_gate_engine_class')
        self.getfield(L, -1, b'RegisterEvent')
        self.setfield(L, -3, b'RegisterEvent')
        self.getfield(L,-1,b'CreateEventEffect');self.setfield(L,-3,b'CreateEventEffect')
        self.top(L, -2)
        def get_obj(s):
            uid = self.tonumber(s, 2, None)
            if uid == values['targetUid']:
                self.getglobal(s, b'_hp_target')
            elif uid == values['casterUid']:
                self.getglobal(s, b'_hp_caster')
            else:
                self.nil(s)
            return 1
        self.method('GetObj', get_obj)
        self.method('LogBattleWithTab', lambda s: 0)
        self.method('Warn',lambda s:0)
        self.method('Info',lambda s:(state_trace.append('Info'),0)[1])
        self.getfield(L, -1, b'battleDT')
        self.getfield(L, -1, b'BattleApi')
        self.table(L, 0, 1)
        self.pushstring(L, b'HP changed')
        self.setfield(L, -2, b'CnID')
        self.setfield(L, -2, b'BSTHpChanged')
        self.top(L,-2)
        self.getfield(L,-1,b'Cmd');self.table(L,0,2);self.pushstring(L,b'synthetic trigger command');self.setfield(L,-2,b'CnID');self.table(L,0,0);self.setfield(L,-2,b'data_list');self.rawset(L,-2,123);self.top(L,-2)
        self.table(L,0,1);self.table(L,0,1);self.pushstring(L,b'synthetic state');self.setfield(L,-2,b'CnID');self.rawset(L,-2,456);self.setfield(L,-2,b'State')
        self.table(L,0,0);self.setfield(L,-2,b'Skill');self.top(L,-2)
        self.table(L,0,1);self.method('IncreaseActionIndex',lambda s:(state_trace.append('IncreaseActionIndex'),0)[1]);self.setfield(L,-2,b'boutMgr')
        self.top(L, 0)

        self.table(L, 0, 8)
        self.getglobal(L, b'_connected_engine')
        self.setfield(L, -2, b'battleEngine')
        self.getglobal(L, b'_hp_owner')
        self.setfield(L, -2, b'owner')
        self.number(L, 77)
        self.setfield(L, -2, b'uid')
        self.number(L, values['priority'])
        self.setfield(L, -2, b'eventPriority')
        self.boolean(L, values['deleted'])
        self.setfield(L, -2, b'isDeleted')
        self.table(L, 0, 2)
        self.pushstring(L, b'synthetic state')
        self.setfield(L, -2, b'CnID')
        self.number(L, 0)
        self.setfield(L, -2, b'DeathHandling')
        self.number(L,123);self.setfield(L,-2,b'TriggerCmd1')
        self.pushstring(L,b'StateOwner');self.setfield(L,-2,b'TriggerTarget1')
        self.setfield(L, -2, b'configData')
        self.number(L,456);self.setfield(L,-2,b'stateId');self.number(L,1);self.setfield(L,-2,b'skillLevel');self.table(L,0,0);self.setfield(L,-2,b'source')
        self.method('IsBan',lambda s:(state_trace.append('IsBan'),self.boolean(s,False),1)[2]);self.method('GetCasterUid',lambda s:(state_trace.append('GetCasterUid'),self.number(s,values['casterUid']),1)[2])
        self.getglobal(L,b'_hp_state_class');self.getfield(L,-1,b'Trigger');self.setfield(L,-3,b'Trigger');self.top(L,-2)
        self.table(L,0,20);self.getglobal(L,b'_connected_engine');self.setfield(L,-2,b'battleEngine');self.number(L,123);self.setfield(L,-2,b'cmdId');self.number(L,456);self.setfield(L,-2,b'stateId');self.number(L,values['casterUid']);self.setfield(L,-2,b'castRoleUid');self.boolean(L,False);self.setfield(L,-2,b'isPreCmd')
        self.table(L,0,2);self.method('ClearMemberValues',lambda s:(state_trace.append('ClearMemberValues'),0)[1]);self.setfield(L,-2,b'cmdParser')
        def generate_targets(s):
            self.table(s,0,1);self.table(s,1,0);self.getglobal(s,b'_hp_owner');self.rawset(s,-2,1);self.setfield(s,-2,b'targets');self.method('GetTargetList',lambda state:(self.getfield(state,1,b'targets'),1)[1]);return 1
        self.method('GenerateTargetsExp',generate_targets)
        for name in ('SetUpperTargets','GetUpperTargets','SetIsDeleted','TriggerCmd'):
            self.getglobal(L,b'_oracle_cmd');self.getfield(L,-1,name.encode());self.setfield(L,-3,name.encode());self.top(L,-2)
        self.method('GetSkillCastTime',lambda s:(state_trace.append('GetSkillCastTime'),self.number(s,0),1)[2]);self.method('OnEnterBeforePhase',lambda s:(state_trace.append('OnEnterBeforePhase'),0)[1]);self.method('SendNotAwakerTimeline',lambda s:(state_trace.append('SendNotAwakerTimeline'),0)[1])
        def generate_effect_list(s):state_trace.append('GenerateEffectList');self.table(s,0,0);return 1
        self.method('GenerateEffectList',generate_effect_list);self.setfield(L,-2,b'triggerCmd1')
        self.setglobal(L, b'_hp_state')

        self.table(L, 0, 2)
        self.boolean(L, values['isEnemy'])
        self.setfield(L, -2, b'isEnemy')
        self.pushstring(L, b'BSTHpChanged')
        self.setfield(L, -2, b'triggerFullName')
        self.integer(L,1);self.setfield(L,-2,b'idx')
        self.setglobal(L, b'_hp_cb_params')

        def callback(s):
            self.getfield(s, 3, b'triggerValue')
            trigger_value = self.tonumber(s, -1, None)
            self.top(s, -2)
            self.getfield(s, 3, b'associator')
            self.rawget(s, -1, 1)
            self.getglobal(s, b'_hp_caster')
            same_associator = bool(self.rawequal(s, -2, -1))
            self.top(s, 3)
            triggered.append({'triggerValue': trigger_value, 'sameAssociator': same_associator})
            return 0
        if values.get('executeState'):
            self.getglobal(L,b'_hp_state_class');self.getfield(L,-1,b'Trigger');self.setglobal(L,b'_hp_callback');self.top(L,0)
        else:
            self.callback(callback);self.setglobal(L, b'_hp_callback')

        self.getglobal(L, b'_oracle_bc')
        self.getfield(L, -1, b'StateTriggerType')
        self.getfield(L, -1, b'Effect')
        trigger_type = self.tonumber(L, -1, None)
        self.top(L, 0)
        self.table(L, 0, 12)
        self._copy(L, b'_hp_trigger_base', ('TryTrigger', 'Trigger'))
        self._copy(L, b'_hp_listener_class', ('OnRoleHpChanged', 'RegisterCallbacks'))
        self.setglobal(L, b'_hp_listener')
        self.getglobal(L, b'_hp_trigger_base')
        self.getfield(L, -1, b'ctor')
        self.getglobal(L, b'_hp_listener')
        self.getglobal(L, b'_hp_state')
        self.getglobal(L, b'_hp_callback')
        self.getglobal(L, b'_hp_cb_params')
        self.number(L, trigger_type)
        self.check(self.call(L, 5, 0, 0, 0, None))
        self.top(L, 0)

        self.getglobal(L, b'_connected_logic_events')
        self.getfield(L, -1, b'RoleHpChanged')
        event_id = self.tonumber(L, -1, None)
        self.top(L, 0)
        self.table(L, 0, 5)
        self.number(L, values['targetUid'])
        self.setfield(L, -2, b'uid')
        self.number(L, values['casterUid'])
        self.setfield(L, -2, b'castRoleUid')
        self.number(L, values['oldValue'])
        self.setfield(L, -2, b'oldValue')
        self.number(L, values['newValue'])
        self.setfield(L, -2, b'newValue')
        self.setglobal(L, b'_hp_event_payload')

        self.getglobal(L, b'_gate_engine_class')
        self.getfield(L, -1, b'CreateEventEffect')
        self.getglobal(L, b'_connected_engine')
        self.number(L, event_id)
        self.getglobal(L, b'_hp_event_payload')
        self.check(self.call(L, 3, 0, 0, 0, None))
        self.top(L, 0)
        self.getglobal(L, b'_connected_effect_mgr')
        self.getfield(L, -1, b'effectList')
        effect_index = int(self.length(L, -1))
        self.rawget(L, -1, effect_index)
        self.setglobal(L, b'_hp_event_effect')
        self.top(L, 0)
        self._call_method(b'_hp_event_effect', b'TryDoEffect', 1)
        eligible = bool(self.tobool(L, -1))
        self.top(L, 0)
        self._call_method(b'_hp_event_effect', b'XpcallDoEffect', 0)
        self.top(L, 0)
        generated_results=[]
        if values.get('executeGenerated') and self.stateEffectConfigs:
            for global_name in (b'_hp_generated_target_effect',b'_hp_generated_phase_effect'):
                self._call_method(global_name,b'TryDoEffect',1);eligible_child=bool(self.tobool(L,-1));self.top(L,0);self._call_method(global_name,b'DoEffect',1);executed_child=bool(self.tobool(L,-1));self.top(L,0);generated_results.append({'eligible':eligible_child,'executed':executed_child})
        if self.errors:
            raise RuntimeError(self.errors)
        result={'effectEligible': eligible, 'triggered': triggered}
        if values.get('executeState'):result.update(generatedEffects=self.stateEffectConfigs,stateEndEvents=self.stateEndEvents,dispatchErrors=dispatch_errors,stateTrace=state_trace)
        if values.get('executeGenerated'):result['generatedExecution']=generated_results
        return result


CASES = [
    {'name':'monster-self-hit','ownerType':'monster','ownerUid':200,'ownerCamp':2,'targetUid':200,'targetCamp':2,'casterUid':300,'oldValue':1000,'newValue':700,'priority':4,'deleted':False,'isEnemy':False},
    {'name':'monster-other-same-camp-rejected','ownerType':'monster','ownerUid':201,'ownerCamp':2,'targetUid':200,'targetCamp':2,'casterUid':300,'oldValue':1000,'newValue':700,'priority':4,'deleted':False,'isEnemy':False},
    {'name':'deleted-state-rejected','ownerType':'monster','ownerUid':200,'ownerCamp':2,'targetUid':200,'targetCamp':2,'casterUid':300,'oldValue':1000,'newValue':700,'priority':4,'deleted':True,'isEnemy':False},
    {'name':'player-ally-positive-delta','ownerType':'player','ownerUid':101,'ownerCamp':1,'targetUid':200,'targetCamp':1,'casterUid':300,'oldValue':700,'newValue':900,'priority':2,'deleted':False,'isEnemy':False},
    {'name':'player-enemy-damage','ownerType':'player','ownerUid':101,'ownerCamp':1,'targetUid':200,'targetCamp':2,'casterUid':300,'oldValue':1000,'newValue':875,'priority':2,'deleted':False,'isEnemy':True},
]


def main():
    oracle = ConnectedHpListenerOracle()
    fixtures = [{'input': row, 'expected': oracle.run_hp_listener(row)} for row in CASES]
    names = ('BattleEngine','BattleEventMgr','BattleEffectMgrServer','BattleEffectServer','BESendEvent','BattleLogicEvent','BattleStateTriggerServer','BSTHpChanged','BattleConst','Table')
    output = ROOT / 'tests/synthetic/original-connected-hp-listener.json'
    output.write_text(json.dumps({'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{name:oracle.assets[name+'.lua']['sha256'] for name in names},'scope':'Original RoleHpChanged event request through effect construction, BESendEvent, BattleEventMgr, BSTHpChanged.OnRoleHpChanged, BattleStateTriggerServer.TryTrigger and Trigger callback. Explicit role/state/engine adapters; trigger callback observed only, with no state command or generated effect execution, gameplay or holdout credit.','fixtures':fixtures},indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Generated',len(fixtures),'connected HP-listener cases')


if __name__ == '__main__':
    main()
