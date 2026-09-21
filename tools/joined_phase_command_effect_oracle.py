"""Join original phase expressions to original effect bodies over one registry."""
import ctypes as C
import json

from phase_cap_expression_oracle import PhaseCapExpressionOracle
from phase_live_layer_effect_oracle import PhaseLiveLayerOracle
from runtime_oracle import ROOT


class JoinedPhaseCommandEffectOracle(PhaseLiveLayerOracle):
    STATE_GLOBALS = {
        46441: b'_joined_immunity_state',
        60407: b'_phase_counter_state',
        60408: b'_joined_second_phase_state',
        60409: b'_phase_damage_state',
    }

    def __init__(self, add_parent_asset=None, func_asset=None):
        super().__init__(add_parent_asset)
        L = self.state
        self.tobool = self.lib.lua_toboolean
        self.tobool.argtypes = [C.c_void_p, C.c_int]
        self.tobool.restype = C.c_int

        def new_class(state):
            self.table(state, 0, 24)
            self.table(state, 0, 1)
            self.method('DoEffect', lambda inner: 0)
            return 2

        self.getglobal(L, b'_oracle_config_system')
        self.method('NewClass', new_class)
        self.top(L, 0)

        def require(state):
            name = self.string(state, 1, None)
            if name == b'System.System':
                self.getglobal(state, b'_oracle_config_system')
            elif name == b'Battle.BattleConst':
                self.getglobal(state, b'_oracle_bc')
            elif name == b'Battle.DbgEngine.Effect.BattleEffectServer':
                self.table(state, 0, 0)
            elif name == b'Battle.DbgEngine.Event.BattleLogicEvent':
                self.table(state, 0, 1)
                self.pushstring(state, b'StateRemove')
                self.setfield(state, -2, b'StateRemove')
            else:
                self.errors.append('Unexpected joined phase dependency: ' + repr(name))
                self.nil(state)
            return 1

        self.callback(require)
        self.setglobal(L, b'require')
        self.module('BERemoveState')
        self.setglobal(L, b'_joined_remove_effect')
        self.module('BEMonsterChangeSkill')
        self.setglobal(L, b'_joined_skill_effect')
        self.expressions = PhaseCapExpressionOracle(func_asset)
        self.commands = json.loads((ROOT / 'research/extracted/config/Cmd.json').read_text(encoding='utf-8'))
        if self.errors:
            raise RuntimeError(self.errors)

    def _target_and_states(self, case):
        L = self.state
        self._target()
        self.getglobal(L, b'_phase_target')
        self.table(L, 0, 1)
        def change_skill(state):
            self.effect_trace.append({'event': 'changeSkill', 'skillId': int(self.tonumber(state, 2, None)), 'slot': int(self.tonumber(state, 3, None))})
            return 0
        self.method('ChangeSkill', change_skill)
        self.setfield(L, -2, b'monsterBehaviorComp')
        self.top(L, 0)

        initial = {46441: 0, 60407: case['counter'], 60408: 0, 60409: 0}
        initial[case['phaseId']] = case['phaseLayers']
        for state_id, global_name in self.STATE_GLOBALS.items():
            self._state_object(global_name, state_id, initial[state_id], self.effect_trace)
            self.getglobal(L, global_name)
            def life_end(state, state_id=state_id):
                self.effect_trace.append({'event': 'lifeEnd', 'stateId': state_id})
                self.boolean(state, True)
                self.setfield(state, 1, b'isDeleted')
                return 0
            self.method('LifeEnd', life_end)
            self.top(L, 0)

    def _manager(self):
        L = self.state
        self.getglobal(L, b'_manager_class')
        self.table(L, 1, 0)
        self.table(L, len(self.STATE_GLOBALS), 0)
        for index, global_name in enumerate(self.STATE_GLOBALS.values(), 1):
            self.getglobal(L, global_name)
            self.rawseti(L, -2, index)
        self.rawseti(L, -2, 7)
        self.setfield(L, -2, b'ownerUid2StateList')
        self.method('IsTeamUniqueState', lambda state: (self.boolean(state, False), 1)[1])
        self.table(L, 0, 8)
        self.table(L, 0, 1)
        self.table(L, 0, len(self.STATE_GLOBALS))
        for state_id in self.STATE_GLOBALS:
            self.table(L, 0, 1)
            self.number(L, self.MAX_COUNTER if state_id != 46441 else 1)
            self.setfield(L, -2, b'MaxLayer')
            self.rawseti(L, -2, state_id)
        self.setfield(L, -2, b'State')
        self.setfield(L, -2, b'battleDT')
        self.method('DebugS', lambda state: 0)
        self.method('CreateEventEffect', lambda state: (self.effect_trace.append({'event': 'stateEvent'}), 0)[1])
        self.table(L, 0, 3)
        self.method('OnChangeStateLayer', lambda state: 0)
        self.method('OnAddState', lambda state: 0)
        self.method('OnAddCardState', lambda state: 0)
        self.setfield(L, -2, b'recordMgr')
        self.table(L, 0, 1)
        self.method('ChangeUniqueStateRole', lambda state: 0)
        self.setfield(L, -2, b'roleMgr')
        self.setfield(L, -2, b'battleEngine')
        self.setglobal(L, b'_joined_phase_manager')

    def _invoke(self, effect_type, params):
        L = self.state
        self.top(L, 0)
        self.table(L, 0, 20)
        self.table(L, 1, 0)
        self.getglobal(L, b'_phase_target')
        self.rawseti(L, -2, 1)
        self.setfield(L, -2, b'targets')
        self.table(L, len(params), 0)
        for index, value in enumerate(params, 1):
            self.number(L, value)
            self.rawseti(L, -2, index)
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
        self.getglobal(L, b'_joined_phase_manager')
        self.setfield(L, -2, b'stateMgr')
        self.table(L, 0, 1)
        self.table(L, 0, len(self.STATE_GLOBALS))
        for state_id in self.STATE_GLOBALS:
            self.table(L, 0, 1)
            self.number(L, self.MAX_COUNTER if state_id != 46441 else 1)
            self.setfield(L, -2, b'MaxLayer')
            self.rawseti(L, -2, state_id)
        self.setfield(L, -2, b'State')
        self.setfield(L, -2, b'battleDT')
        self.setfield(L, -2, b'battleEngine')
        if effect_type == 'BEAddState':
            for method in ('AddState', '__AddStateInternal'):
                self.getglobal(L, b'_phase_add_parent')
                self.getfield(L, -1, method.encode())
                self.setfield(L, -3, method.encode())
                self.top(L, -2)
            self.method('CheckImmue', lambda state: (self.boolean(state, False), 1)[1])
            self.method('__CalcStateLayer', lambda state: (self.number(state, self.tonumber(state, 2, None)), 1)[1])
            self.method('__ShowTips', lambda state: 0)
        self.setglobal(L, b'_joined_effect_self')
        module = {
            'BEAddState': b'_phase_add_effect',
            'BESubStateLayer': b'_phase_sub_effect',
            'BERemoveState': b'_joined_remove_effect',
            'BEMonsterChangeSkill': b'_joined_skill_effect',
        }[effect_type]
        self.getglobal(L, module)
        self.getfield(L, -1, b'DoEffect')
        self.getglobal(L, b'_joined_effect_self')
        self.check(self.call(L, 1, 0, 0, 0, None))

    def _state_snapshot(self):
        L = self.state
        result = {}
        for state_id, global_name in self.STATE_GLOBALS.items():
            self.top(L, 0)
            self.getglobal(L, global_name)
            self.getfield(L, -1, b'isDeleted')
            deleted = bool(self.tobool(L, -1))
            self.top(L, 0)
            self.getglobal(L, global_name)
            self.getfield(L, -1, b'data')
            self.getfield(L, -1, b'layer')
            result[state_id] = {'live': not deleted, 'layers': 0 if deleted else self.tonumber(L, -1, None)}
        return result

    def run_joined(self, case):
        self.top(self.state, 0)
        self.effect_trace = []
        self.errors.clear()
        self._target_and_states(case)
        self._manager()
        rows = self.commands[str(case['commandId'])]['data_list']
        last_condition = 0
        row_trace = []
        operations = []
        skill = None
        for index, row in sorted(rows.items(), key=lambda item: int(item[0])):
            snapshot = self._state_snapshot()
            self.expressions.layers = {state_id: value['layers'] for state_id, value in snapshot.items()}
            self.expressions.reads = []
            if 'Cond' in row:
                result = self.expressions.expression(row['Cond'], case['hpLoss'], last_condition, case['maxHp'])
                passed = result == [True]
                last_condition = 1 if passed else 0
                if not passed:
                    row_trace.append({'row': int(index), 'type': row['Type'], 'passed': False})
                    continue
            params = self.expressions.expression(row['Para'], case['hpLoss'], last_condition, case['maxHp'])
            self._invoke(row['Type'], params)
            row_trace.append({'row': int(index), 'type': row['Type'], 'passed': True, 'params': params})
            state_id = int(params[0])
            amount = params[1] if len(params) > 1 else 1
            after = self._state_snapshot()
            if row['Type'] == 'BEAddState':
                op_type = 'addCounter' if state_id == 60407 else 'addState'
                operation = {'type': op_type, 'stateId': state_id, 'layers': after[state_id]['layers']}
                if state_id == 60407:
                    operation['requested'] = case['hpLoss']
                operations.append(operation)
            elif row['Type'] == 'BESubStateLayer':
                operations.append({'type': 'subtractPhase', 'stateId': state_id, 'layers': after[state_id]['layers']})
            elif row['Type'] == 'BERemoveState':
                operations.append({'type': 'removeState', 'stateId': state_id})
            elif row['Type'] == 'BEMonsterChangeSkill':
                skill = state_id
                operations.append({'type': 'changeMonsterSkill', 'skillId': state_id, 'slot': int(amount)})
        final = self._state_snapshot()
        if final[60408]['live'] and final[60408]['layers'] > 0:
            phase_id = 60408
        elif final[60409]['live'] and final[60409]['layers'] > 0:
            phase_id = 60409
        else:
            phase_id = 0
        state = {
            'maxHp': case['maxHp'],
            'phaseId': phase_id,
            'phaseLayers': final[phase_id]['layers'] if phase_id else 0,
            'counter': final[60407]['layers'],
            'immune': final[46441]['live'] and final[46441]['layers'] > 0,
        }
        if self.errors:
            raise RuntimeError(self.errors)
        return {'state': state, 'operations': operations, 'passedRows': [row['row'] for row in row_trace if row['passed']], 'skill': skill, 'rows': row_trace, 'effectTrace': self.effect_trace}


if __name__ == '__main__':
    oracle = JoinedPhaseCommandEffectOracle()
    cases = [
        {'maxHp': 1000, 'phaseId': 60409, 'phaseLayers': 331, 'counter': 0, 'hpLoss': 125, 'commandId': 60406},
        {'maxHp': 1000, 'phaseId': 60409, 'phaseLayers': 126, 'counter': 10, 'hpLoss': 125, 'commandId': 60406},
        {'maxHp': 1000, 'phaseId': 60409, 'phaseLayers': 125, 'counter': 0, 'hpLoss': 330, 'commandId': 60406},
        {'maxHp': 12345, 'phaseId': 60408, 'phaseLayers': 500, 'counter': 10, 'hpLoss': 125, 'commandId': 60405},
        {'maxHp': 12345, 'phaseId': 60408, 'phaseLayers': 126, 'counter': 999999990, 'hpLoss': 125, 'commandId': 60405},
    ]
    fixtures = [{'input': case, 'expected': oracle.run_joined(case)} for case in cases]
    names = ('FuncTable', 'Cmd', 'BEAddState', 'BEAddStateParent', 'BESubStateLayer', 'BERemoveState', 'BEMonsterChangeSkill', 'BattleStateMgrServer', 'BattleStateServer')
    output = {
        'kind': 'SYNTHETIC_ORIGINAL_RUNTIME',
        'build': 'pc-res144-build51',
        'sourceHashes': {name: oracle.assets[name + '.lua']['sha256'] for name in names},
        'scope': (
            'Python row iterator joins original compiled Cond/Para closures for commands 60406/60405 to '
            'original add/subtract/remove/monster-skill effect bodies over one original manager registry and '
            'original existing-state layer methods. Destination states 46441/60408 and counter 60407 are '
            'pre-created live zero-layer adapters; LifeEnd marks deletion and other callbacks are observers. '
            'No original command parser/effect scheduler, state construction/property bodies, gameplay or holdout.'
        ),
        'fixtures': fixtures,
    }
    path = ROOT / 'tests/synthetic/original-joined-phase-command-effects.json'
    path.write_text(json.dumps(output, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(f'Generated {len(fixtures)} joined phase command/effect cases at {path.relative_to(ROOT)}')
