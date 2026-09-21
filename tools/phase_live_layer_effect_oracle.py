"""Original add/sub effects mutating two states in one live manager registry.

The state objects and target are explicit adapters.  The effect entry points,
manager lookup/merge routing, and state AddLayer/SubLayer arithmetic are the
copied original Lua bytecode.
"""
import itertools
import json

from state_manager_creation_oracle import StateManagerOracle
from runtime_oracle import ROOT


class PhaseLiveLayerOracle(StateManagerOracle):
    COUNTER_STATE = 60407
    PHASE_STATE = 60409
    MAX_COUNTER = 999999999

    def __init__(self, add_parent_asset=None):
        super().__init__()
        L = self.state

        def new_class(state):
            self.table(state, 0, 80)
            self.table(state, 0, 1)
            self.method('DoEffect', lambda inner: 0)
            return 2

        self.getglobal(L, b'_oracle_config_system')
        self.method('NewClass', new_class)
        self.top(L, 0)

        def require(state):
            name = self.string(state, 1, None)
            known = {
                b'System.System': b'_oracle_config_system',
                b'Battle.BattleConst': b'_oracle_bc',
                b'Battle.Util.BattleUtilServer': b'_oracle_util',
                b'Battle.DbgEngine.Effect.BEAddStateParent': b'_phase_add_parent',
            }
            if name in known:
                self.getglobal(state, known[name])
            elif name in (
                b'Battle.DbgEngine.Effect.BattleEffectServer',
                b'Battle.DbgEngine.Card.BattleCardServer',
            ):
                self.table(state, 0, 0)
            else:
                self.errors.append('Unexpected phase-layer dependency: ' + repr(name))
                self.nil(state)
            return 1

        self.callback(require)
        self.setglobal(L, b'require')
        self.module('BEAddStateParent', add_parent_asset)
        self.setglobal(L, b'_phase_add_parent')
        self.module('BEAddState')
        self.setglobal(L, b'_phase_add_effect')
        self.module('BESubStateLayer')
        self.setglobal(L, b'_phase_sub_effect')
        if self.errors:
            raise RuntimeError(self.errors)

    def _target(self):
        L = self.state
        self.table(L, 0, 8)
        self.number(L, 7)
        self.setfield(L, -2, b'uid')
        self.method('IsRoleType', lambda state: (self.boolean(state, True), 1)[1])
        self.method('IsDead', lambda state: (self.boolean(state, False), 1)[1])
        self.method('is', lambda state: (self.boolean(state, False), 1)[1])
        self.method('CalcStateLayerLimit', lambda state: (self.number(state, self.tonumber(state, 3, None)), 1)[1])
        self.method('CalcStateLayerLimitTotal', lambda state: (self.number(state, self.tonumber(state, 3, None)), 1)[1])
        self.setglobal(L, b'_phase_target')

    def _state_object(self, global_name, state_id, layers, trace):
        L = self.state
        self.table(L, 0, 24)
        for key, value in (('uid', state_id + 100000), ('stateId', state_id), ('castRoleUid', 9)):
            self.number(L, value)
            self.setfield(L, -2, key.encode())
        self.boolean(L, False)
        self.setfield(L, -2, b'isDeleted')
        self.getglobal(L, b'_phase_target')
        self.setfield(L, -2, b'owner')
        self.table(L, 0, 1)
        self.number(L, 9)
        self.setfield(L, -2, b'castRoleUid')
        self.setfield(L, -2, b'createArgs')
        self.table(L, 0, 3)
        self.number(L, layers)
        self.setfield(L, -2, b'layer')
        self.number(L, 0)
        self.setfield(L, -2, b'changedLayer')
        self.table(L, 0, 0)
        self.setfield(L, -2, b'casterLayerList')
        self.setfield(L, -2, b'data')
        self.table(L, 0, 0)
        self.setfield(L, -2, b'source')
        self.table(L, 0, 1)
        self.number(L, self.MAX_COUNTER)
        self.setfield(L, -2, b'MaxLayer')
        self.setfield(L, -2, b'configData')
        self.table(L, 0, 1)
        self.method('GetValueByCmd', lambda state: (self.number(state, self.MAX_COUNTER), 1)[1])
        self.setfield(L, -2, b'cmdServer')
        self.method('GetCasterUid', lambda state: (self.number(state, 9), 1)[1])

        def get_args(state):
            self.table(state, 0, 0)
            self.table(state, 0, 0)
            return 2

        self.method('GetArgs', get_args)

        def observe(event):
            def callback(state):
                row = {'event': event, 'stateId': state_id}
                if event == 'propertyDelta':
                    row['value'] = self.tonumber(state, 2, None)
                trace.append(row)
                return 0
            return callback

        self.method('UpdatePropertyWhenLayerChanges', observe('propertyDelta'))
        self.method('LogBattleLayer', observe('log'))
        self.method('LifeEnd', observe('lifeEnd'))
        self.table(L, 0, 2)
        self.method('DebugS', lambda state: 0)
        self.table(L, 0, 1)
        self.method('OnChangeStateLayer', observe('record'))
        self.setfield(L, -2, b'recordMgr')
        self.setfield(L, -2, b'battleEngine')
        for method in ('AddLayer', 'SubLayer', '_ReduceCasterLayers'):
            self.getglobal(L, b'_routing_module')
            self.getfield(L, -1, method.encode())
            self.setfield(L, -3, method.encode())
            self.top(L, -2)
        self.setglobal(L, global_name)

    def _manager(self, trace):
        L = self.state
        self.getglobal(L, b'_manager_class')
        self.table(L, 1, 0)
        self.table(L, 2, 0)
        self.getglobal(L, b'_phase_counter_state')
        self.rawseti(L, -2, 1)
        self.getglobal(L, b'_phase_damage_state')
        self.rawseti(L, -2, 2)
        self.rawseti(L, -2, 7)
        self.setfield(L, -2, b'ownerUid2StateList')
        self.method('IsTeamUniqueState', lambda state: (self.boolean(state, False), 1)[1])
        self.table(L, 0, 8)
        self.table(L, 0, 1)
        self.table(L, 0, 2)
        self.table(L, 0, 0)
        self.rawseti(L, -2, self.COUNTER_STATE)
        self.table(L, 0, 0)
        self.rawseti(L, -2, self.PHASE_STATE)
        self.setfield(L, -2, b'State')
        self.setfield(L, -2, b'battleDT')
        self.method('DebugS', lambda state: 0)
        self.method('CreateEventEffect', lambda state: (trace.append({'event': 'stateOnAdd'}), 0)[1])
        self.table(L, 0, 3)
        self.method('OnChangeStateLayer', lambda state: 0)
        self.method('OnAddState', lambda state: 0)
        self.method('OnAddCardState', lambda state: 0)
        self.setfield(L, -2, b'recordMgr')
        self.table(L, 0, 1)
        self.method('ChangeUniqueStateRole', lambda state: 0)
        self.setfield(L, -2, b'roleMgr')
        self.setfield(L, -2, b'battleEngine')
        self.setglobal(L, b'_phase_manager')

    def _effect(self, global_name, effect_class, state_id, amount, add):
        L = self.state
        self.table(L, 0, 20)
        self.table(L, 1, 0)
        self.getglobal(L, b'_phase_target')
        self.rawseti(L, -2, 1)
        self.setfield(L, -2, b'targets')
        self.table(L, 2, 0)
        self.number(L, state_id)
        self.rawseti(L, -2, 1)
        self.number(L, amount)
        self.rawseti(L, -2, 2)
        self.setfield(L, -2, b'params')
        self.table(L, 0, 0)
        self.setfield(L, -2, b'effectConfig')
        self.table(L, 0, 5)
        self.number(L, 9)
        self.setfield(L, -2, b'castRoleUid')
        self.number(L, 11)
        self.setfield(L, -2, b'uid')
        self.method('GetSkillLevel', lambda state: (self.number(state, 1), 1)[1])
        self.setfield(L, -2, b'cmdServer')
        self.table(L, 0, 3)
        self.getglobal(L, b'_phase_manager')
        self.setfield(L, -2, b'stateMgr')
        self.table(L, 0, 1)
        self.table(L, 0, 2)
        self.table(L, 0, 0)
        self.rawseti(L, -2, self.COUNTER_STATE)
        self.table(L, 0, 0)
        self.rawseti(L, -2, self.PHASE_STATE)
        self.setfield(L, -2, b'State')
        self.setfield(L, -2, b'battleDT')
        self.setfield(L, -2, b'battleEngine')
        if add:
            for method in ('AddState', '__AddStateInternal'):
                self.getglobal(L, b'_phase_add_parent')
                self.getfield(L, -1, method.encode())
                self.setfield(L, -3, method.encode())
                self.top(L, -2)
            self.method('CheckImmue', lambda state: (self.boolean(state, False), 1)[1])
            self.method('__CalcStateLayer', lambda state: (self.number(state, self.tonumber(state, 2, None)), 1)[1])
            self.method('__ShowTips', lambda state: 0)
        self.setglobal(L, global_name)
        self.getglobal(L, effect_class)
        self.getfield(L, -1, b'DoEffect')
        self.getglobal(L, global_name)
        self.check(self.call(L, 1, 0, 0, 0, None))

    def run(self, counter_before, phase_before, amount):
        self.trace = []
        self.errors.clear()
        self.top(self.state, 0)
        self._target()
        self._state_object(b'_phase_counter_state', self.COUNTER_STATE, counter_before, self.trace)
        self._state_object(b'_phase_damage_state', self.PHASE_STATE, phase_before, self.trace)
        self._manager(self.trace)
        self._effect(b'_phase_add_self', b'_phase_add_effect', self.COUNTER_STATE, amount, True)
        self._effect(b'_phase_sub_self', b'_phase_sub_effect', self.PHASE_STATE, amount, False)

        def layer(global_name):
            L = self.state
            self.top(L, 0)
            self.getglobal(L, global_name)
            self.getfield(L, -1, b'data')
            self.getfield(L, -1, b'layer')
            return self.tonumber(L, -1, None)

        result = {
            'counterAfter': layer(b'_phase_counter_state'),
            'phaseAfter': layer(b'_phase_damage_state'),
            'trace': self.trace,
        }
        expected_counter = min(self.MAX_COUNTER, counter_before + amount)
        expected_phase = max(0, phase_before - amount)
        assert result['counterAfter'] == expected_counter
        assert result['phaseAfter'] == expected_phase
        if self.errors:
            raise RuntimeError(self.errors)
        return result


if __name__ == '__main__':
    oracle = PhaseLiveLayerOracle()
    fixtures = []
    for counter, phase, amount in itertools.product(
        (0, 10, 999999990),
        (1, 2, 125, 126, 331),
        (1, 2, 125, 330),
    ):
        inputs = {'counterBefore': counter, 'phaseBefore': phase, 'amount': amount}
        fixtures.append({'input': inputs, 'expected': oracle.run(counter, phase, amount)})
    names = ('BEAddState', 'BEAddStateParent', 'BESubStateLayer', 'BattleStateMgrServer', 'BattleStateServer')
    output = {
        'kind': 'SYNTHETIC_ORIGINAL_RUNTIME',
        'build': 'pc-res144-build51',
        'sourceHashes': {name: oracle.assets[name + '.lua']['sha256'] for name in names},
        'scope': (
            'Original BEAddState -> BEAddStateParent.AddState -> BattleStateMgrServer.CreateState/GetState '
            '-> existing BattleStateServer.AddLayer, followed on the same target registry by original '
            'BESubStateLayer -> BattleStateMgrServer.GetState -> BattleStateServer.SubLayer. Synthetic target '
            'and existing state objects; property, record, log, life-end and state-on-add callbacks observed. '
            'No first-time state construction, property implementation, event body, command condition, gameplay or holdout.'
        ),
        'fixtures': fixtures,
    }
    path = ROOT / 'tests/synthetic/original-phase-live-layer-effects.json'
    path.write_text(json.dumps(output, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(f'Generated {len(fixtures)} connected live-registry layer cases at {path.relative_to(ROOT)}')
