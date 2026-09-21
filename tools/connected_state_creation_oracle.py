"""Connect BEAddState to original manager registration and state construction."""
import ctypes as C
import itertools
import json

from state_constructor_oracle import ConstructorOracle
from runtime_oracle import ROOT


class ConnectedStateCreationOracle(ConstructorOracle):
    COUNTER_STATE = 60407

    def __init__(self, add_parent_asset=None, connect_property=False, property_asset=None):
        super().__init__()
        L = self.state
        self.trace = []
        self.maximum = 1
        self.requested_layer = 1
        self.connect_property = connect_property
        self.rawlen = self.lib.lua_rawlen
        self.rawlen.argtypes = [C.c_void_p, C.c_int]
        self.rawlen.restype = C.c_size_t

        def construct(state):
            self.trace.append('construct')
            self.table(state, 0, 30)
            for method in ('ctor', 'InitStateParams', 'AfterInit'):
                self.getglobal(state, b'_ctor_class')
                self.getfield(state, -1, method.encode())
                self.setfield(state, -3, method.encode())
                self.top(state, -2)

            def init_parser(inner):
                self.trace.append('parser')
                self.table(inner, 0, 1)
                def evaluate(call):
                    expression = self.string(call, 2, None)
                    value = self.requested_layer if expression == b'ChangedLayer' else self.maximum
                    self.number(call, value)
                    return 1
                self.method('GetValueByCmd', evaluate)
                self.setfield(inner, 1, b'cmdServer')
                return 0

            self.method('InitCmdParser', init_parser)
            for method in ('InitTrigger', 'LogBattleLayer', 'Serialize'):
                def observe(inner, method=method):
                    self.trace.append(method)
                    if method == 'Serialize':
                        self.table(inner, 0, 0)
                        return 1
                    return 0
                self.method(method, observe)
            if self.connect_property:
                for method in ('InitProperty', 'ChangeOwnerProperty', 'CalcSpecialValue', 'IsBan', 'GetCasterUid'):
                    self.getglobal(state, b'_ctor_class')
                    self.getfield(state, -1, method.encode())
                    self.setfield(state, -3, method.encode())
                    self.top(state, -2)
            else:
                self.method('InitProperty', lambda inner: (self.trace.append('InitProperty'), 0)[1])

            # Manager calls the constructor with (target, createArgs). Keep the
            # fresh subject below the nested original ctor call and return it.
            self.getfield(state, -1, b'ctor')
            self.pushvalue(state, -2)
            self.pushvalue(state, 1)
            self.pushvalue(state, 2)
            code = self.call(state, 3, 0, 0, 0, None)
            if code:
                self.errors.append(self.string(state, -1, None))
                self.top(state, 3)
                self.nil(state)
            return 1

        self.callback(construct)
        self.setglobal(L, b'_connected_state_constructor')

        def new_class(state):
            self.table(state, 0, 80)
            self.table(state, 0, 2)
            self.method('ctor', lambda inner: 0)
            self.method('DoEffect', lambda inner: 0)
            return 2

        self.getglobal(L, b'_oracle_config_system')
        self.method('NewClass', new_class)
        self.top(L, 0)
        self.table(L, 0, 1)
        self.method('RecordActionStats_AddState', lambda state: (self.trace.append('stats'), 0)[1])
        self.setglobal(L, b'_connected_state_stats')
        self.table(L, 0, 1)
        self.pushstring(L, b'StateOnAdd')
        self.setfield(L, -2, b'StateOnAdd')
        self.setglobal(L, b'_connected_state_event')

        def manager_require(state):
            name = self.string(state, 1, None)
            known = {
                b'System.System': b'_oracle_config_system',
                b'Battle.BattleConst': b'_oracle_bc',
                b'Battle.DbgEngine.State.BattleStateServer': b'_connected_state_constructor',
                b'Battle.DbgEngine.Stats.BattleActionStatsUtil': b'_connected_state_stats',
                b'Battle.DbgEngine.Event.BattleLogicEvent': b'_connected_state_event',
            }
            if name in known:
                self.getglobal(state, known[name])
            elif name in (b'Battle.DbgEngine.Card.BattleCardServer', b'Battle.Ecs.BattleEngineComponent'):
                self.table(state, 0, 0)
            else:
                self.errors.append('Unexpected connected-manager dependency: ' + repr(name))
                self.nil(state)
            return 1

        self.callback(manager_require)
        self.setglobal(L, b'require')
        self.module('BattleStateMgrServer')
        self.setglobal(L, b'_connected_state_manager')

        def effect_require(state):
            name = self.string(state, 1, None)
            known = {
                b'System.System': b'_oracle_config_system',
                b'Battle.BattleConst': b'_oracle_bc',
                b'Battle.Util.BattleUtilServer': b'_oracle_util',
                b'Battle.DbgEngine.Effect.BEAddStateParent': b'_connected_state_add_parent',
            }
            if name in known:
                self.getglobal(state, known[name])
            elif name in (b'Battle.DbgEngine.Effect.BattleEffectServer', b'Battle.DbgEngine.Card.BattleCardServer'):
                self.table(state, 0, 0)
            else:
                self.errors.append('Unexpected connected-effect dependency: ' + repr(name))
                self.nil(state)
            return 1

        self.callback(effect_require)
        self.setglobal(L, b'require')
        self.module('BEAddStateParent', add_parent_asset)
        self.setglobal(L, b'_connected_state_add_parent')
        self.module('BEAddState')
        self.setglobal(L, b'_connected_state_add_effect')
        if self.connect_property:
            def property_require(state):
                name = self.string(state, 1, None)
                known = {
                    b'System.System': b'_oracle_config_system',
                    b'Battle.BattleConst': b'_oracle_bc',
                    b'Battle.Util.BattleUtilServer': b'_oracle_util',
                }
                if name in known:
                    self.getglobal(state, known[name])
                elif name in (b'Battle.Ecs.BattleComponent', b'Battle.DbgEngine.Event.BattleLogicEvent'):
                    self.table(state, 0, 0)
                else:
                    self.errors.append('Unexpected connected-property dependency: ' + repr(name))
                    self.nil(state)
                return 1
            self.callback(property_require)
            self.setglobal(L, b'require')
            self.module('BattlePropertyServer', property_asset)
            self.setglobal(L, b'_connected_state_property')
        if self.errors:
            raise RuntimeError(self.errors)

    def _config(self, state_id, maximum):
        L = self.state
        self.table(L, 0, 5)
        self.number(L, state_id)
        self.setfield(L, -2, b'ID')
        self.number(L, maximum)
        self.setfield(L, -2, b'MaxLayer')
        self.pushstring(L, f'state-{state_id}'.encode())
        self.setfield(L, -2, b'CnID')
        self.number(L, 0)
        self.setfield(L, -2, b'DeathHandling')
        self.number(L, 1)
        self.setfield(L, -2, b'StateType')
        if self.connect_property and state_id == self.COUNTER_STATE:
            self.table(L, 0, 1)
            self.pushstring(L, b'ChangedLayer')
            self.setfield(L, -2, b'be_damage_statics')
            self.setfield(L, -2, b'ExistProperty')

    def _engine(self, state_id, maximum, global_name):
        L = self.state
        self.table(L, 0, 9)
        self.method('GenObjUid', lambda state: (self.trace.append('uid'), self.number(state, 88), 1)[2])
        self.method('DebugS', lambda state: 0)
        self.method('CreateEventEffect', lambda state: (self.trace.append('onAdd'), 0)[1])
        self.method('IsPVE', lambda state: (self.boolean(state, False), 1)[1])
        self.method('GetObj', lambda state: (self.getglobal(state, b'_connected_state_target'), 1)[1])
        self.table(L, 0, 1)
        self.table(L, 0, 1)
        self._config(state_id, maximum)
        self.rawseti(L, -2, state_id)
        self.setfield(L, -2, b'State')
        if self.connect_property:
            self.table(L, 0, 1)
            self.table(L, 0, 1)
            self.pushstring(L, '角色属性'.encode('utf-8'))
            self.setfield(L, -2, b'ApiType')
            self.setfield(L, -2, b'be_damage_statics')
            self.setfield(L, -2, b'BattleApi')
        self.setfield(L, -2, b'battleDT')
        self.table(L, 0, 3)
        self.method('OnAddState', lambda state: (self.trace.append('recordRole'), 0)[1])
        self.method('OnAddCardState', lambda state: (self.trace.append('recordCard'), 0)[1])
        self.method('OnChangeStateLayer', lambda state: 0)
        self.setfield(L, -2, b'recordMgr')
        self.table(L, 0, 1)
        self.method('ChangeUniqueStateRole', lambda state: (self.trace.append('unique'), 0)[1])
        self.setfield(L, -2, b'roleMgr')
        self.setglobal(L, global_name)

    def run(self, state_id, requested_layer, maximum):
        L = self.state
        self.top(L, 0)
        self.trace = []
        self.errors.clear()
        self.maximum = maximum
        self.requested_layer = requested_layer
        self._engine(state_id, maximum, b'_connected_owner_engine')

        self.table(L, 0, 10)
        self.number(L, 7)
        self.setfield(L, -2, b'uid')
        self.number(L, 1)
        self.setfield(L, -2, b'camp')
        self.method('IsRoleType', lambda state: (self.boolean(state, True), 1)[1])
        self.method('IsDead', lambda state: (self.boolean(state, False), 1)[1])
        self.method('is', lambda state: (self.boolean(state, False), 1)[1])
        self.method('CalcStateLayerLimit', lambda state: (self.number(state, self.tonumber(state, 3, None)), 1)[1])
        self.method('CalcStateLayerLimitTotal', lambda state: (self.number(state, self.tonumber(state, 3, None)), 1)[1])
        self.getglobal(L, b'_connected_owner_engine')
        self.setfield(L, -2, b'battleEngine')
        self.setglobal(L, b'_connected_state_target')

        if self.connect_property:
            def owner_changed(state):
                self.trace.append({'event': 'ownerProperty', 'property': self.string(state, 2, None).decode(), 'old': self.tonumber(state, 3, None), 'new': self.tonumber(state, 4, None)})
                return 0
            self.getglobal(L, b'_connected_state_target')
            self.method('OnPropertyChanged', owner_changed)
            self.top(L, 0)
            self.getglobal(L, b'_connected_state_property')
            self.table(L, 0, 1)
            self.number(L, 0)
            self.setfield(L, -2, b'be_damage_statics')
            self.setfield(L, -2, b'properties')
            self.getglobal(L, b'_connected_state_target')
            self.setfield(L, -2, b'owner')
            def sent(state):
                self.trace.append({'event': 'sendProperty', 'property': self.string(state, 3, None).decode(), 'delta': self.tonumber(state, 4, None), 'new': self.tonumber(state, 5, None)})
                return 0
            self.method('SendOnPropertyChanged', sent)
            self.setglobal(L, b'_connected_state_property_live')
            self.getglobal(L, b'_connected_state_target')
            self.getglobal(L, b'_connected_state_property_live')
            self.setfield(L, -2, b'property')
            self.top(L, 0)

        self.getglobal(L, b'_connected_state_manager')
        self.table(L, 0, 0)
        self.setfield(L, -2, b'ownerUid2StateList')
        self.method('IsTeamUniqueState', lambda state: (self.boolean(state, False), 1)[1])
        self.getglobal(L, b'_connected_owner_engine')
        self.setfield(L, -2, b'battleEngine')
        self.setglobal(L, b'_connected_state_manager_live')

        self.table(L, 0, 20)
        self.table(L, 1, 0)
        self.getglobal(L, b'_connected_state_target')
        self.rawseti(L, -2, 1)
        self.setfield(L, -2, b'targets')
        self.table(L, 2, 0)
        self.number(L, state_id)
        self.rawseti(L, -2, 1)
        self.number(L, requested_layer)
        self.rawseti(L, -2, 2)
        self.setfield(L, -2, b'params')
        self.table(L, 0, 0)
        self.setfield(L, -2, b'effectConfig')
        for method in ('AddState', '__AddStateInternal'):
            self.getglobal(L, b'_connected_state_add_parent')
            self.getfield(L, -1, method.encode())
            self.setfield(L, -3, method.encode())
            self.top(L, -2)
        self.method('CheckImmue', lambda state: (self.boolean(state, False), 1)[1])
        self.method('__CalcStateLayer', lambda state: (self.number(state, self.tonumber(state, 2, None)), 1)[1])
        self.method('__ShowTips', lambda state: 0)
        self.table(L, 0, 5)
        self.number(L, 9)
        self.setfield(L, -2, b'castRoleUid')
        self.number(L, 11)
        self.setfield(L, -2, b'uid')
        self.method('GetSkillLevel', lambda state: (self.number(state, 1), 1)[1])
        self.setfield(L, -2, b'cmdServer')
        self.table(L, 0, 2)
        self.getglobal(L, b'_connected_state_manager_live')
        self.setfield(L, -2, b'stateMgr')
        self.table(L, 0, 1)
        self.table(L, 0, 1)
        self._config(state_id, maximum)
        self.rawseti(L, -2, state_id)
        self.setfield(L, -2, b'State')
        self.setfield(L, -2, b'battleDT')
        self.setfield(L, -2, b'battleEngine')
        self.setglobal(L, b'_connected_state_effect_self')

        self.getglobal(L, b'_connected_state_add_effect')
        self.getfield(L, -1, b'DoEffect')
        self.getglobal(L, b'_connected_state_effect_self')
        self.check(self.call(L, 1, 0, 0, 0, None))
        if self.errors:
            raise RuntimeError(self.errors)

        self.top(L, 0)
        self.getglobal(L, b'_connected_state_manager_live')
        self.getfield(L, -1, b'ownerUid2StateList')
        self.rawget(L, -1, 7)
        registry_count = self.rawlen(L, -1)
        self.rawget(L, -1, 1)
        self.setglobal(L, b'_connected_created_state')

        def field(path):
            self.top(L, 0)
            self.getglobal(L, b'_connected_created_state')
            for key in path:
                if isinstance(key, int):
                    self.rawget(L, -1, key)
                else:
                    self.getfield(L, -1, key.encode())
            return self.tonumber(L, -1, None)

        result = {
            'registryCount': registry_count,
            'uid': field(['uid']),
            'stateId': field(['stateId']),
            'layer': field(['data', 'layer']),
            'changedLayer': field(['data', 'changedLayer']),
            'casterLayers9': field(['data', 'casterLayerList', 9]),
            'trace': self.trace,
        }
        if self.connect_property:
            self.top(L, 0)
            self.getglobal(L, b'_connected_state_property_live')
            self.getfield(L, -1, b'properties')
            self.getfield(L, -1, b'be_damage_statics')
            result['beDamageStatics'] = self.tonumber(L, -1, None)
        assert result['registryCount'] == 1
        assert result['stateId'] == state_id
        assert result['layer'] == min(maximum, requested_layer)
        assert result['changedLayer'] == requested_layer
        assert result['casterLayers9'] == requested_layer
        if self.connect_property:
            assert state_id == self.COUNTER_STATE
            assert result['beDamageStatics'] == requested_layer
        return result


if __name__ == '__main__':
    catalog = json.loads((ROOT / 'research/extracted/config/State.json').read_text(encoding='utf-8'))
    state_ids = (46441, 60407, 60408, 60409)
    oracle = ConnectedStateCreationOracle()
    fixtures = []
    for state_id, requested in itertools.product(state_ids, (1, 2, 125, 330)):
        maximum = catalog[str(state_id)]['MaxLayer']
        inputs = {'stateId': state_id, 'requestedLayer': requested, 'maximum': maximum}
        fixtures.append({'input': inputs, 'expected': oracle.run(state_id, requested, maximum)})
    names = ('BEAddState', 'BEAddStateParent', 'BattleStateMgrServer', 'BattleStateServer', 'BattleStateData')
    output = {
        'kind': 'SYNTHETIC_ORIGINAL_RUNTIME',
        'build': 'pc-res144-build51',
        'sourceHashes': {name: oracle.assets[name + '.lua']['sha256'] for name in names},
        'catalogStates': {str(state_id): {'MaxLayer': catalog[str(state_id)]['MaxLayer']} for state_id in state_ids},
        'scope': (
            'Original BEAddState/BEAddStateParent routes an absent state through original '
            'BattleStateMgrServer CreateState/__CreateState into original BattleStateServer ctor and '
            'BattleStateData.Create, then original AfterInit and manager registration/record/event/stat order. '
            'Actual extracted MaxLayer for states 46441/60407/60408/60409. Constructor callable wrapper, '
            'parser maximum resolver and trigger/log/property/serialize callbacks are explicit adapters. '
            'No actual parser, trigger registration, property contribution, event body, gameplay or holdout.'
        ),
        'fixtures': fixtures,
    }
    path = ROOT / 'tests/synthetic/original-connected-state-creation.json'
    path.write_text(json.dumps(output, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(f'Generated {len(fixtures)} connected first-time state cases at {path.relative_to(ROOT)}')
