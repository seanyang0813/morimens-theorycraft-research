"""Connect event request construction to original effect execution and listener dispatch."""
import ctypes as C
import json

from engine_event_oracle import EngineEventOracle, ROOT


class ConnectedEventListenerOracle(EngineEventOracle):
    def __init__(self, asset_overrides=None):
        asset_overrides = asset_overrides or {}
        super().__init__(asset_overrides)
        L = self.state
        self.rawget = self.lib.lua_rawgeti
        self.rawget.argtypes = [C.c_void_p, C.c_int, C.c_longlong]
        self.rawget.restype = C.c_int
        self.kind = self.lib.lua_type
        self.kind.argtypes = [C.c_void_p, C.c_int]
        self.kind.restype = C.c_int

        # BattleEventMgr depends on the game's shallow clone helper while dispatching.
        self.module('Table', asset_overrides.get('Table'))
        self.top(L, 0)

        self.table(L, 0, 2)
        self.method('ctor', lambda s: 0)
        self.method('Dispose', lambda s: 0)
        self.setglobal(L, b'_connected_entity_super')

        def base_new_class(s):
            self.table(s, 0, 80)
            self.getglobal(s, b'_connected_entity_super')
            return 2

        self.getglobal(L, b'_oracle_config_system')
        self.method('NewClass', base_new_class)
        self.top(L, 0)

        def base_require(s):
            name = self.string(s, 1, None)
            if name == b'System.System':
                self.getglobal(s, b'_oracle_config_system')
            elif name == b'Battle.BattleConst':
                self.getglobal(s, b'_oracle_bc')
            elif name == b'Battle.Ecs.BattleEntity':
                self.getglobal(s, b'_connected_entity_super')
            else:
                self.errors.append('Unexpected base dependency: ' + repr(name))
                self.nil(s)
            return 1

        self.callback(base_require)
        self.setglobal(L, b'require')
        self.module('BattleEffectServer', asset_overrides.get('BattleEffectServer'))
        self.setglobal(L, b'_connected_effect_base')

        def subclass_new_class(s):
            self.table(s, 0, 16)
            self.getglobal(s, b'_connected_effect_base')
            return 2

        self.getglobal(L, b'_oracle_config_system')
        self.method('NewClass', subclass_new_class)
        self.top(L, 0)

        def send_require(s):
            name = self.string(s, 1, None)
            known = {
                b'System.System': b'_oracle_config_system',
                b'Battle.BattleConst': b'_oracle_bc',
                b'Battle.DbgEngine.Effect.BattleEffectServer': b'_connected_effect_base',
                b'Battle.DbgEngine.Event.BattleLogicEvent': b'_connected_logic_events',
            }
            if name in known:
                self.getglobal(s, known[name])
            else:
                self.errors.append('Unexpected send dependency: ' + repr(name))
                self.nil(s)
            return 1

        self.module('BattleLogicEvent', asset_overrides.get('BattleLogicEvent'))
        self.setglobal(L, b'_connected_logic_events')
        self.callback(send_require)
        self.setglobal(L, b'require')
        self.module('BESendEvent', asset_overrides.get('BESendEvent'))
        self.setglobal(L, b'_connected_send_class')

        def component_new_class(s):
            self.table(s, 0, 40)
            self.getglobal(s, b'_connected_entity_super')
            return 2

        self.getglobal(L, b'_oracle_config_system')
        self.method('NewClass', component_new_class)
        self.top(L, 0)

        def event_mgr_require(s):
            name = self.string(s, 1, None)
            if name == b'System.System':
                self.getglobal(s, b'_oracle_config_system')
            elif name == b'Battle.Ecs.BattleComponent':
                self.getglobal(s, b'_connected_entity_super')
            else:
                self.errors.append('Unexpected event-manager dependency: ' + repr(name))
                self.nil(s)
            return 1

        self.callback(event_mgr_require)
        self.setglobal(L, b'require')
        self.module('BattleEventMgr', asset_overrides.get('BattleEventMgr'))
        self.setglobal(L, b'_connected_event_mgr_class')

        self.getglobal(L, b'_oracle_config_system')
        self.method('NewClass', component_new_class)
        self.top(L, 0)

        def effect_mgr_require(s):
            name = self.string(s, 1, None)
            known = {
                b'System.System': b'_oracle_config_system',
                b'Battle.BattleConst': b'_oracle_bc',
                b'Battle.DbgEngine.Event.BattleLogicEvent': b'_connected_logic_events',
                b'Battle.DbgEngine.Effect.BattleEffectServer': b'_connected_effect_base',
            }
            if name in known:
                self.getglobal(s, known[name])
            elif name == b'Battle.Ecs.BattleEngineComponent':
                self.getglobal(s, b'_connected_entity_super')
            else:
                self.errors.append('Unexpected effect-manager dependency: ' + repr(name))
                self.nil(s)
            return 1

        self.callback(effect_mgr_require)
        self.setglobal(L, b'require')
        self.module('BattleEffectMgrServer', asset_overrides.get('BattleEffectMgrServer'))
        self.setglobal(L, b'_connected_effect_mgr_class')

        self.send_ctor_cb = C.CFUNCTYPE(C.c_int, C.c_void_p)(self._construct_send_effect)
        self.callbacks.append(self.send_ctor_cb)

        def runtime_require(s):
            name = self.string(s, 1, None)
            if name == b'Battle.DbgEngine.Effect.BESendEvent':
                self.pushclosure(s, self.send_ctor_cb, 0)
            else:
                self.errors.append('Unexpected runtime dependency: ' + repr(name))
                self.nil(s)
            return 1

        self.callback(runtime_require)
        self.setglobal(L, b'require')
        if self.errors:
            raise RuntimeError(self.errors)

    def _copy(self, state, source, names):
        for name in names:
            self.getglobal(state, source)
            self.getfield(state, -1, name.encode())
            self.setfield(state, -3, name.encode())
            self.top(state, -2)

    def _construct_send_effect(self, state):
        self.pushvalue(state, 1)
        self.setglobal(state, b'_connected_engine_arg')
        self.pushvalue(state, 2)
        self.setglobal(state, b'_connected_config_arg')
        self.table(state, 0, 48)
        self._copy(state, b'_connected_effect_base', (
            'PreTrigger', 'AppendToParentEffect', 'TryDoEffect', 'CheckCondition',
            'GenTargets', 'GenParams', 'PlayEffectSfx', 'XpcallDoEffect',
            'AfterEffect', 'CheckSubEffectEmpty', 'RunNextMultiEffect', 'EffectEnd',
            'GetEffectConfig', 'GetConfigBeforeDelay', 'GetConfigAfterDelay',
            'RemoveFromParentEffect', 'DoMultiEffect'
        ))
        self._copy(state, b'_connected_send_class', ('DoEffect', 'EffectEnd'))
        self.setglobal(state, b'_connected_effect_object')
        self.getglobal(state, b'_connected_send_class')
        self.getfield(state, -1, b'ctor')
        self.getglobal(state, b'_connected_effect_object')
        self.getglobal(state, b'_connected_engine_arg')
        self.getglobal(state, b'_connected_config_arg')
        self.check(self.call(state, 3, 0, 0, 0, None))
        self.top(state, 0)
        self.getglobal(state, b'_connected_effect_object')
        return 1

    def _call_method(self, global_name, method, results=0):
        L = self.state
        self.getglobal(L, global_name)
        self.getfield(L, -1, method)
        self.getglobal(L, global_name)
        self.check(self.call(L, 1, results, 0, 0, None))

    def run_connected(self, values):
        L = self.state
        self.top(L, 0)
        self.errors.clear()
        trace = []
        elapsed = []
        next_uid = [100]

        self.table(L, 0, 2)
        self.number(L, 999)
        self.setfield(L, -2, b'uid')
        self.setglobal(L, b'_connected_root')

        self.table(L, 0, 20)
        self.method('IsAutoBattleOp', lambda s: (self.boolean(s, values['autoBattle']), 1)[1])
        self.method('IsBattleFinish', lambda s: (self.boolean(s, False), 1)[1])
        self.method('GetCurPassTime', lambda s: (self.number(s, 12.5), 1)[1])
        self.method('GetObj', lambda s: (self.nil(s), 1)[1])
        self.method('UnregisterAllEventsByTarget', lambda s: 0)
        self.method('Debug', lambda s: 0)
        self.method('Error', lambda s: (self.errors.append('engine error'), 0)[1])
        def gen_uid(s):
            next_uid[0] += 1
            self.number(s, next_uid[0])
            return 1
        self.method('GenObjUid', gen_uid)
        def add_time(s):
            elapsed.append(self.tonumber(s, 2, None))
            return 0
        self.method('AddPassTime', add_time)
        self.table(L, 0, 2)
        self.table(L, 0, 0)
        self.setfield(L, -2, b'Cmd')
        self.table(L, 0, 0)
        self.setfield(L, -2, b'BattleApi')
        self.setfield(L, -2, b'battleDT')
        self.setglobal(L, b'_connected_engine')

        self.table(L, 0, 12)
        self._copy(L, b'_connected_event_mgr_class', (
            'ctor', 'RegisterEvent', 'RegisterEventToHead', 'UnregisterEvent', 'SendEvent'
        ))
        self.setglobal(L, b'_connected_event_mgr')
        self._call_method(b'_connected_event_mgr', b'ctor')
        self.top(L, 0)

        self.table(L, 0, 20)
        self._copy(L, b'_connected_effect_mgr_class', (
            'CreateEffect', 'GetEffectByUid', 'GetParentEffectUid', 'SetRunningEffect',
            'GetRunningEffect', 'AddRunEffectNum', 'EffectEnd'
        ))
        self.getglobal(L, b'_connected_engine')
        self.setfield(L, -2, b'battleEngine')
        self.table(L, 0, 0)
        self.setfield(L, -2, b'effectList')
        self.number(L, 0)
        self.setfield(L, -2, b'runEffectNum')
        self.getglobal(L, b'_connected_root')
        self.setfield(L, -2, b'rootEffect')
        self.setglobal(L, b'_connected_effect_mgr')

        self.getglobal(L, b'_connected_engine')
        self.getglobal(L, b'_connected_event_mgr')
        self.setfield(L, -2, b'eventMgr')
        self.getglobal(L, b'_connected_effect_mgr')
        self.setfield(L, -2, b'effectMgr')
        self.top(L, 0)

        for name, priority, head in [('low', 1, False), ('high', 3, False), ('head', 3, True)]:
            self.table(L, 0, 1)
            self.number(L, priority)
            self.setfield(L, -2, b'eventPriority')
            self.setglobal(L, ('_connected_target_' + name).encode())
            def callback(s, name=name):
                self.getglobal(s, b'_connected_payload')
                same = bool(self.rawequal(s, 2, -1))
                self.top(s, -2)
                self.getfield(s, 2, b'isAutoOp')
                auto = bool(self.tobool(s, -1))
                self.top(s, -2)
                self.getfield(s, 2, b'token')
                token = self.tonumber(s, -1, None)
                self.top(s, -2)
                trace.append({'listener': name, 'samePayload': same, 'isAutoOp': auto, 'token': token})
                return 0
            self.callback(callback)
            self.setglobal(L, ('_connected_callback_' + name).encode())
            self.getglobal(L, b'_connected_event_mgr')
            method = b'RegisterEventToHead' if head else b'RegisterEvent'
            self.getfield(L, -1, method)
            self.getglobal(L, b'_connected_event_mgr')
            self.number(L, 987654)
            self.getglobal(L, ('_connected_callback_' + name).encode())
            self.getglobal(L, ('_connected_target_' + name).encode())
            self.check(self.call(L, 4, 0, 0, 0, None))
            self.top(L, 0)

        self.table(L, 0, 2)
        self.number(L, values['token'])
        self.setfield(L, -2, b'token')
        if values['explicitAuto'] is not None:
            self.boolean(L, values['explicitAuto'])
            self.setfield(L, -2, b'isAutoOp')
        self.setglobal(L, b'_connected_payload')

        self.getglobal(L, b'_gate_engine_class')
        self.getfield(L, -1, b'CreateEventEffect')
        self.getglobal(L, b'_connected_engine')
        self.number(L, 987654)
        self.getglobal(L, b'_connected_payload')
        self.check(self.call(L, 3, 0, 0, 0, None))
        self.top(L, 0)

        self.getglobal(L, b'_connected_effect_mgr')
        self.getfield(L, -1, b'effectList')
        self.rawget(L, -1, 1)
        self.setglobal(L, b'_connected_created_effect')
        self.top(L, 0)
        self._call_method(b'_connected_created_effect', b'TryDoEffect', 1)
        eligible = bool(self.tobool(L, -1))
        self.top(L, 0)
        self._call_method(b'_connected_created_effect', b'XpcallDoEffect', 0)
        self.top(L, 0)

        self.getglobal(L, b'_connected_created_effect')
        self.getfield(L, -1, b'isDeleted')
        deleted = bool(self.tobool(L, -1))
        self.top(L, 0)
        self.getglobal(L, b'_connected_effect_mgr')
        self.getfield(L, -1, b'runEffectNum')
        run_count = self.tonumber(L, -1, None)
        self.top(L, 0)
        if self.errors:
            raise RuntimeError(self.errors)
        return {
            'eligible': eligible,
            'listenerTrace': trace,
            'effectDeleted': deleted,
            'runEffectNum': run_count,
            'elapsed': elapsed,
        }


CASES = [
    {'name': 'auto-default-false', 'autoBattle': False, 'explicitAuto': None, 'token': 11},
    {'name': 'auto-default-true', 'autoBattle': True, 'explicitAuto': None, 'token': 22},
    {'name': 'explicit-false-preserved', 'autoBattle': True, 'explicitAuto': False, 'token': 33},
    {'name': 'explicit-true-preserved', 'autoBattle': False, 'explicitAuto': True, 'token': 44},
]


def main():
    oracle = ConnectedEventListenerOracle()
    fixtures = [{'input': case, 'expected': oracle.run_connected(case)} for case in CASES]
    output = ROOT / 'tests/synthetic/original-connected-event-listener.json'
    names = ('BattleEngine', 'BattleEventMgr', 'BattleEffectMgrServer', 'BattleEffectServer',
             'BESendEvent', 'BattleLogicEvent', 'BattleConst', 'Table')
    output.write_text(json.dumps({
        'kind': 'SYNTHETIC_ORIGINAL_RUNTIME',
        'build': 'pc-res144-build51',
        'sourceHashes': {name: oracle.assets[name + '.lua']['sha256'] for name in names},
        'scope': 'Original BattleEngine.CreateEventEffect through original effect-manager construction, BESendEvent eligibility/execution/completion and BattleEventMgr listener dispatch. Explicit engine clock/UID/battle-state adapters and an inert root-effect boundary; no listener-generated effects, state triggers, damage, gameplay or holdout credit.',
        'fixtures': fixtures,
    }, indent=2) + '\n', encoding='utf-8', newline='\n')
    print('Generated', len(fixtures), 'connected event-listener cases')


if __name__ == '__main__':
    main()
