"""Evaluate phase Cond/Para strings through the original command parser.

The copied parser controls expression caching, environment lookup, Arg1 and
LastConditionRet.  A narrow target-expression adapter exposes only max_hp and
GetStateLayer; copied FuncTable closures remain the expression implementation.
"""
import ctypes as C

from command_argument_oracle import ArgumentOracle


class PhaseCommandParserOracle(ArgumentOracle):
    LUA_REGISTRYINDEX = -1001000

    def __init__(self, func_asset=None, parser_asset=None, cmd_asset=None):
        overrides = {'FuncTable': func_asset} if func_asset else {}
        if parser_asset:
            overrides['BattleCmdParser'] = parser_asset
        if cmd_asset:
            overrides['BattleCmdServer'] = cmd_asset
        super().__init__(overrides)
        L = self.state
        self.rawlen = self.lib.lua_rawlen
        self.rawlen.argtypes = [C.c_void_p, C.c_int]
        self.rawlen.restype = C.c_size_t
        self.gettop = self.lib.lua_gettop
        self.gettop.argtypes = [C.c_void_p]
        self.gettop.restype = C.c_int
        self.settable = self.lib.lua_settable
        self.settable.argtypes = [C.c_void_p, C.c_int]
        self.settable.restype = None

        @C.CFUNCTYPE(C.c_int, C.c_void_p)
        def bound_call(state):
            argc = self.gettop(state)
            self.pushvalue(state, self.LUA_REGISTRYINDEX - 2)  # function
            self.pushvalue(state, self.LUA_REGISTRYINDEX - 1)  # bound self
            for index in range(1, argc + 1):
                self.pushvalue(state, index)
            code = self.call(state, argc + 1, -1, 0, 0, None)
            if code:
                self.errors.append(self.string(state, -1, None).decode('utf-8', 'replace'))
                self.top(state, argc); self.nil(state)
                return 1
            return self.gettop(state) - argc

        @C.CFUNCTYPE(C.c_int, C.c_void_p)
        def bind(state):
            self.pushvalue(state, 1)
            self.pushvalue(state, 2)
            self.pushclosure(state, bound_call, 2)
            return 1

        @C.CFUNCTYPE(C.c_int, C.c_void_p)
        def compiled_call(state):
            argc = self.gettop(state)
            self.pushvalue(state, self.LUA_REGISTRYINDEX - 1)  # compiled function
            self.pushvalue(state, self.LUA_REGISTRYINDEX - 2)  # parser fenv
            code = self.call(state, 1, -1, 0, 0, None)
            if code:
                self.errors.append(self.string(state, -1, None).decode('utf-8', 'replace'))
                self.top(state, argc); self.nil(state)
                return 1
            return self.gettop(state) - argc

        self.callbacks.extend((bound_call, bind, compiled_call))
        self._compiled_call = compiled_call
        self.getglobal(L, b'_oracle_config_system')
        self.pushclosure(L, bind, 0)
        self.setfield(L, -2, b'fn')
        self.top(L, 0)

        self.module('FuncTable', func_asset)
        self.setglobal(L, b'_phase_parser_functions')
        self._install_subject()
        self._install_command_subject()
        self._install_effect_construction()

    def _expression_object(self, state):
        self.table(state, 0, 3)
        self.number(state, self.max_hp)
        self.setfield(state, -2, b'max_hp')

        def get_layer(inner):
            # FuncTable uses dot syntax; the production target expression
            # exposes a System.fn-bound method, while this narrow adapter is a
            # direct closure and therefore receives the state ID at slot 1.
            state_id = int(self.tonumber(inner, self.gettop(inner), None))
            self.reads.append(state_id)
            self.number(inner, self.layers.get(state_id, 0))
            return 1

        self.method('GetStateLayer', get_layer)
        def get_targets(inner):
            self.table(inner, 1, 0)
            self.getglobal(inner, b'_phase_construct_target')
            self.rawseti(inner, -2, 1)
            return 1
        self.method('GetTargetList', get_targets)
        return 1

    def _install_subject(self):
        L = self.state
        self.top(L, 0)
        self.table(L, 0, 20)
        for name in ('__GetValueByCmd', 'GetValueByCmd', 'GetValueListByCmd',
                     'EnvMetaFunc', 'GenerateTargetsExp', 'GetGlobalValue'):
            self.getglobal(L, b'_target_parser')
            self.getfield(L, -1, name.encode())
            self.setfield(L, -3, name.encode())
            self.top(L, -2)
        self.method('GenerateTargetsExp', self._expression_object)
        self.table(L, 0, 0); self.setfield(L, -2, b'cmdFuncs')
        self.table(L, 1, 0); self.table(L, 0, 0); self.rawseti(L, -2, 1); self.setfield(L, -2, b'upperTargets')
        self.table(L, 0, 0); self.setfield(L, -2, b'skillArgs')
        self.pushstring(L, b''); self.setfield(L, -2, b'configPara')
        self.boolean(L, False); self.setfield(L, -2, b'lastConditionRet')

        self.table(L, 0, 5)
        self.table(L, 0, 2)
        self.table(L, 0, 0); self.setfield(L, -2, b'CommonID')
        self.table(L, 0, 3)
        for key, api_name in ((b'Arg1', b'GLOBAL_VALUE'),
                              (b'LastConditionRet', b'GLOBAL_VALUE'),
                              (b'UpperTarget', b'TARGET')):
            self.table(L, 0, 1)
            self.getglobal(L, b'_oracle_bc')
            self.getfield(L, -1, b'ApiType')
            self.getfield(L, -1, api_name)
            self.setfield(L, -4, b'ApiType')
            self.top(L, -3)
            self.setfield(L, -2, key)
        self.setfield(L, -2, b'BattleApi')
        self.setfield(L, -2, b'battleDT')

        def get_func(state):
            expression = self.string(state, 2, None)
            self.getglobal(state, b'_phase_parser_functions')
            self.getfield(state, -1, expression)
            self.pushvalue(state, 3)
            self.pushclosure(state, self._compiled_call, 2)
            return 1

        def error(state):
            message = self.string(state, 2, None)
            self.errors.append(message.decode('utf-8', 'replace') if message else 'parser error')
            return 0

        self.method('GetCmdFunc', get_func)
        self.method('Error', error)
        self.setfield(L, -2, b'battleEngine')
        self.setglobal(L, b'_phase_parser_subject')

    def _install_command_subject(self):
        L = self.state
        self.top(L, 0)
        self.table(L, 0, 5)
        for name in ('GetValueByCmd', 'GetValueListByCmd', 'GenerateTargetsExp', 'CheckCondition', 'GenerateEffectList'):
            self.getglobal(L, b'_oracle_cmd')
            self.getfield(L, -1, name.encode())
            self.setfield(L, -3, name.encode())
            self.top(L, -2)
        self.getglobal(L, b'_phase_parser_subject')
        self.setfield(L, -2, b'cmdParser')
        self.number(L, 1); self.setfield(L, -2, b'skillConfigId')
        self.number(L, 9); self.setfield(L, -2, b'castRoleUid')

        self.method('CheckLoopCall', lambda state: (self.boolean(state, False), 1)[1])

        def get_skill_args(state):
            self.table(state, 1, 0)
            self.number(state, self.argument)
            self.rawseti(state, -2, 1)
            return 1

        def get_delays(state):
            self.table(state, len(self.catalog_rows), 0)
            for index in range(1, len(self.catalog_rows) + 1):
                self.number(state, 0)
                self.rawseti(state, -2, index)
            return 1

        self.method('GetSkillArgs', get_skill_args)
        self.method('GetEffectDelayTimes', get_delays)
        self.method('SetLastEffect', lambda state: 0)
        self.getglobal(L, b'_phase_parser_subject')
        self.getfield(L, -1, b'battleEngine')
        self.setglobal(L, b'_phase_shared_engine')
        self.top(L, -2)
        self.getglobal(L, b'_phase_shared_engine')
        self.method('LogBattleWithTab', lambda state: 0)
        self.setfield(L, -2, b'battleEngine')
        self.setglobal(L, b'_phase_command_subject')

    def _copy_methods(self, state, source, names):
        for name in names:
            self.getglobal(state, source)
            self.getfield(state, -1, name.encode())
            self.setfield(state, -3, name.encode())
            self.top(state, -2)

    def _install_effect_construction(self):
        L = self.state
        self.top(L, 0)
        self.table(L, 0, 2)
        self.method('ctor', lambda state: 0)
        self.method('Dispose', lambda state: 0)
        self.setglobal(L, b'_phase_construct_super')

        def set_new_class(super_global):
            self.getglobal(L, b'_oracle_config_system')
            def new_class(state):
                self.table(state, 0, 80)
                self.getglobal(state, super_global)
                return 2
            self.method('NewClass', new_class)
            self.top(L, 0)

        def install_require(mapping, empty=()):
            def require(state):
                name = self.string(state, 1, None)
                if name in mapping:
                    self.getglobal(state, mapping[name])
                elif name in empty:
                    self.table(state, 0, 0)
                else:
                    self.errors.append('Unexpected phase construction dependency: ' + repr(name))
                    self.nil(state)
                return 1
            self.callback(require)
            self.setglobal(L, b'require')

        set_new_class(b'_phase_construct_super')
        install_require({
            b'System.System': b'_oracle_config_system',
            b'Battle.BattleConst': b'_oracle_bc',
            b'Battle.Ecs.BattleEntity': b'_phase_construct_super',
        }, (b'Battle.DbgEngine.Event.BattleLogicEvent',))
        self.module('BattleEffectServer')
        self.setglobal(L, b'_phase_construct_base')

        set_new_class(b'_phase_construct_base')
        install_require({
            b'System.System': b'_oracle_config_system',
            b'Battle.BattleConst': b'_oracle_bc',
            b'Battle.Util.BattleUtilServer': b'_oracle_util',
            b'Battle.DbgEngine.Effect.BattleEffectServer': b'_phase_construct_base',
        }, (b'Battle.DbgEngine.Card.BattleCardServer',))
        self.module('BEAddStateParent')
        self.setglobal(L, b'_phase_construct_add_parent')

        effect_modules = (
            ('BEAddState', b'_phase_construct_add_parent'),
            ('BESubStateLayer', b'_phase_construct_base'),
            ('BERemoveState', b'_phase_construct_base'),
            ('BEMonsterChangeSkill', b'_phase_construct_base'),
        )
        for name, super_global in effect_modules:
            set_new_class(super_global)
            install_require({
                b'System.System': b'_oracle_config_system',
                b'Battle.BattleConst': b'_oracle_bc',
                b'Battle.DbgEngine.Effect.BattleEffectServer': b'_phase_construct_base',
                b'Battle.DbgEngine.Effect.BEAddStateParent': b'_phase_construct_add_parent',
            }, (b'Battle.DbgEngine.Event.BattleLogicEvent',))
            self.module(name)
            self.setglobal(L, ('_phase_construct_' + name).encode())

        set_new_class(b'_phase_construct_super')
        install_require({
            b'System.System': b'_oracle_config_system',
            b'Battle.BattleConst': b'_oracle_bc',
            b'Battle.DbgEngine.Effect.BattleEffectServer': b'_phase_construct_base',
        }, (b'Battle.DbgEngine.Event.BattleLogicEvent', b'Battle.Ecs.BattleEngineComponent'))
        self.module('BattleEffectMgrServer')
        self.setglobal(L, b'_phase_construct_manager_class')

        self.effect_constructor_callbacks = {}
        for name, _ in effect_modules:
            class_global = ('_phase_construct_' + name).encode()
            def construct(state, class_global=class_global):
                self.pushvalue(state, 1); self.setglobal(state, b'_phase_construct_engine_arg')
                self.pushvalue(state, 2); self.setglobal(state, b'_phase_construct_config_arg')
                self.table(state, 0, 30)
                self._copy_methods(state, b'_phase_construct_base', (
                    'PreTrigger', 'AppendToParentEffect', 'AddRunningSubEffect',
                    'TryDoEffect', 'CheckCondition', '__CheckDeadCondition',
                    'GetConfigBeforeDelay', 'GenTargets', 'GenParams',
                    'AfterEffect', 'CheckSubEffectEmpty', 'RunSubEffect',
                    'RunNextMultiEffect', 'SubEffectEnd', 'DoMultiEffect',
                    'XpcallDoEffect', 'EffectEnd', 'RemoveFromParentEffect',
                    'GetConfigAfterDelay', 'GetEffectConfig',
                ))
                self._copy_methods(state, class_global, ('DoEffect',))
                self.setglobal(state, b'_phase_construct_object')
                self.getglobal(state, class_global); self.getfield(state, -1, b'ctor')
                if self.kind(state, -1) != 6:
                    self.top(state, -2)
                    self.getglobal(state, b'_phase_construct_base'); self.getfield(state, -1, b'ctor')
                self.getglobal(state, b'_phase_construct_object')
                self.getglobal(state, b'_phase_construct_engine_arg')
                self.getglobal(state, b'_phase_construct_config_arg')
                self.check(self.call(state, 3, 0, 0, 0, None))
                self.top(state, 0); self.getglobal(state, b'_phase_construct_object')
                return 1
            callback = C.CFUNCTYPE(C.c_int, C.c_void_p)(construct)
            self.callbacks.append(callback)
            self.effect_constructor_callbacks[name.encode()] = callback

        def runtime_require(state):
            name = self.string(state, 1, None)
            prefix = b'Battle.DbgEngine.Effect.'
            effect_name = name[len(prefix):] if name and name.startswith(prefix) else b''
            callback = self.effect_constructor_callbacks.get(effect_name)
            if callback:
                self.pushclosure(state, callback, 0)
            else:
                self.errors.append('Unexpected runtime effect dependency: ' + repr(name))
                self.nil(state)
            return 1
        self.callback(runtime_require)
        self.setglobal(L, b'require')

        self.table(L, 0, 5)
        for name in ('CreateEffect', 'SetRunningEffect', 'GetRunningEffect',
                     'GetParentEffectUid', 'GetEffectByUid', 'EffectEnd',
                     'AddRunEffectNum', 'IsOverflow', 'RunRootEffect'):
            self.getglobal(L, b'_phase_construct_manager_class'); self.getfield(L, -1, name.encode())
            self.setfield(L, -3, name.encode()); self.top(L, -2)
        self.table(L, 0, 0); self.setfield(L, -2, b'effectList')
        self.setglobal(L, b'_phase_construct_manager')

        self.getglobal(L, b'_phase_shared_engine')
        self.number(L, 100); self.setfield(L, -2, b'_nextUid')
        def uid(state):
            self.getfield(state, 1, b'_nextUid'); value = self.tonumber(state, -1, None) + 1; self.top(state, -2)
            self.number(state, value); self.setfield(state, 1, b'_nextUid'); self.number(state, value); return 1
        self.method('GenObjUid', uid)
        self.method('IsBattleFinish', lambda state: (self.boolean(state, False), 1)[1])
        self.method('IsPVE', lambda state: (self.boolean(state, True), 1)[1])
        self.method('GetCurPassTime', lambda state: (self.number(state, 0), 1)[1])
        self.method('AddPassTime', lambda state: 0)
        def get_obj(state):
            uid_value = int(self.tonumber(state, 2, None))
            if uid_value == 9:
                self.getglobal(state, b'_phase_construct_caster')
            elif uid_value == 1:
                self.getglobal(state, b'_phase_scheduler_root')
            elif uid_value in getattr(self, 'effect_uids', set()):
                self.getglobal(state, f'_phase_effect_uid_{uid_value}'.encode())
            else:
                self.nil(state)
            return 1
        self.method('GetObj', get_obj)
        for name in ('Debug', 'Info'):
            self.method(name, lambda state: 0)
        self.getglobal(L, b'_phase_construct_manager'); self.setfield(L, -2, b'effectMgr')
        self.top(L, 0)
        self.getglobal(L, b'_phase_construct_manager')
        self.getglobal(L, b'_phase_shared_engine'); self.setfield(L, -2, b'battleEngine')
        self.top(L, 0)

        self.getglobal(L, b'_phase_command_subject')
        self.getglobal(L, b'_oracle_cmd'); self.getfield(L, -1, b'GenerateEffectObj')
        self.setfield(L, -3, b'GenerateEffectObj'); self.top(L, -2)
        self.top(L, 0)

        self.table(L, 0, 1)
        self.method('IsDead', lambda state: (self.boolean(state, False), 1)[1])
        self.setglobal(L, b'_phase_construct_player')
        self.table(L, 0, 2)
        def get_player(state):
            self.getglobal(state, b'_phase_construct_player'); return 1
        self.method('GetPlayer', get_player)
        self.setglobal(L, b'_phase_construct_caster')
        self.table(L, 0, 1)
        self.number(L, 7); self.setfield(L, -2, b'uid')
        self.setglobal(L, b'_phase_construct_target')

        self.getglobal(L, b'string')
        def split(state):
            values = self.string(state, 1, None).decode().split(self.string(state, 2, None).decode())
            self.table(state, len(values), 0)
            for index, value in enumerate(values, 1):
                self.pushstring(state, value.encode()); self.rawseti(state, -2, index)
            return 1
        self.method('split', split)
        self.method('startswith', lambda state: (self.boolean(state, self.string(state, 1, None).startswith(self.string(state, 2, None))), 1)[1])
        self.top(L, 0)
        if self.errors:
            raise RuntimeError(self.errors)

    def begin(self, argument, max_hp, layers, last_condition=False):
        L = self.state
        self.errors.clear()
        self.argument = argument
        self.max_hp = max_hp
        self.layers = layers
        self.reads = []
        self.top(L, 0)

    def generate_rows(self, command_id, rows):
        """Return row indices produced by original GenerateEffectList."""
        L = self.state
        ordered = [rows[key] for key in sorted(rows, key=int)]
        self.catalog_rows = ordered
        self.top(L, 0)
        self.getglobal(L, b'_phase_parser_subject')
        self.getglobal(L, b'_target_parser')
        self.getfield(L, -1, b'UpdateSkillArgs')
        self.setfield(L, -3, b'UpdateSkillArgs')
        self.top(L, -2)

        self.getglobal(L, b'_phase_command_subject')
        self.number(L, command_id); self.setfield(L, -2, b'cmdId')
        self.getfield(L, -1, b'battleEngine')
        self.getfield(L, -1, b'battleDT')
        self.table(L, 0, 1)
        self.number(L, command_id)
        self.table(L, 0, 1)
        self.table(L, len(ordered), 0)
        for index, row in enumerate(ordered, 1):
            self.table(L, 0, len(row))
            for key, value in row.items():
                if isinstance(value, str): self.pushstring(L, value.encode())
                elif isinstance(value, bool): self.boolean(L, value)
                elif isinstance(value, (int, float)): self.number(L, value)
                else: continue
                self.setfield(L, -2, key.encode())
            self.rawseti(L, -2, index)
        self.setfield(L, -2, b'data_list')
        self.settable(L, -3)
        self.setfield(L, -2, b'Cmd')
        self.table(L, 1, 0); self.table(L, 0, 0); self.rawseti(L, -2, 1)
        self.setfield(L, -2, b'Skill')
        self.getfield(L, -1, b'BattleApi')
        for effect_type in sorted({row['Type'].split('.')[0] for row in ordered}):
            self.table(L, 0, 1)
            self.getglobal(L, b'_oracle_bc'); self.getfield(L, -1, b'ApiType'); self.getfield(L, -1, b'CMD')
            self.setfield(L, -4, b'ApiType'); self.top(L, -3)
            self.setfield(L, -2, effect_type.encode())
        self.top(L, 0)

        self.getglobal(L, b'_oracle_cmd')
        self.getfield(L, -1, b'GenerateEffectList')
        self.getglobal(L, b'_phase_command_subject')
        self.nil(L)
        self.boolean(L, False)
        self.check(self.call(L, 3, 1, 0, 0, None))
        if self.errors:
            raise RuntimeError(self.errors)
        generated_rows = []
        self.effect_uids = set()
        for index in range(1, self.rawlen(L, -1) + 1):
            self.rawgeti(L, -1, index)
            self.getfield(L, -1, b'uid'); effect_uid = int(self.tonumber(L, -1, None)); self.top(L, -2)
            self.pushvalue(L, -1); self.setglobal(L, f'_phase_effect_uid_{effect_uid}'.encode())
            self.effect_uids.add(effect_uid)
            self.getfield(L, -1, b'effectConfig'); self.getfield(L, -1, b'cmdIndex')
            generated_rows.append(int(self.tonumber(L, -1, None))); self.top(L, -4)
        if generated_rows != list(range(1, len(ordered) + 1)):
            raise RuntimeError(f'GenerateEffectList row order mismatch: {generated_rows}')
        self.setglobal(L, b'_phase_generated_effects')
        return generated_rows

    def run_scheduler(self, row_count, body_hook):
        """Run original root/subeffect recursion; body_hook executes verified bodies."""
        L = self.state
        self.execution_rows = []
        self.body_hook = body_hook
        self.top(L, 0)

        self.table(L, 0, 30)
        for name in ('TryDoEffect', 'CheckCondition', 'GetConfigBeforeDelay',
                     'GenTargets', 'GenParams', 'XpcallDoEffect', 'AfterEffect',
                     'CheckSubEffectEmpty', 'RunSubEffect', 'RunNextMultiEffect',
                     'SubEffectEnd', 'DoMultiEffect', 'EffectEnd',
                     'RemoveFromParentEffect', 'GetConfigAfterDelay',
                     'GetEffectConfig', 'AddRunningSubEffect'):
            self.getglobal(L, b'_phase_construct_base'); self.getfield(L, -1, name.encode())
            self.setfield(L, -3, name.encode()); self.top(L, -2)
        self.number(L, 1); self.setfield(L, -2, b'uid')
        self.getglobal(L, b'_phase_shared_engine'); self.setfield(L, -2, b'battleEngine')
        self.table(L, 0, 0); self.setfield(L, -2, b'subEffectList')
        self.table(L, 0, 1); self.pushstring(L, b'PhaseRoot'); self.setfield(L, -2, b'effectType'); self.setfield(L, -2, b'effectConfig')
        self.pushstring(L, b'PhaseRoot'); self.setfield(L, -2, b'effectType')
        self.method('DoEffect', lambda state: (self.boolean(state, True), 1)[1])
        self.setglobal(L, b'_phase_scheduler_root')

        self.getglobal(L, b'_phase_construct_manager')
        self.getglobal(L, b'_phase_scheduler_root'); self.setfield(L, -2, b'rootEffect')
        self.getglobal(L, b'_phase_scheduler_root'); self.setfield(L, -2, b'runningEffect')
        self.number(L, 0); self.setfield(L, -2, b'runEffectNum')
        self.boolean(L, False); self.setfield(L, -2, b'effectOrderFinished')
        self.top(L, 0)

        for index in range(1, row_count + 1):
            self.getglobal(L, b'_phase_generated_effects'); self.rawgeti(L, -1, index)
            def execute(state, index=index):
                self.getfield(state, 1, b'params')
                params = []
                for param_index in range(1, self.rawlen(state, -1) + 1):
                    self.rawgeti(state, -1, param_index)
                    params.append(self.tonumber(state, -1, None))
                    self.top(state, -2)
                self.top(state, 1)
                updated_layers = self.body_hook(index, params)
                if updated_layers is not None:
                    self.layers = updated_layers
                self.execution_rows.append({'row': index, 'passed': True, 'params': params})
                self.boolean(state, True)
                return 1
            self.method('DoEffect', execute)
            self.getfield(L, -1, b'PreTrigger'); self.pushvalue(L, -2); self.nil(L)
            self.check(self.call(L, 2, 0, 0, 0, None))
            self.top(L, 0)

        self.getglobal(L, b'_phase_construct_manager')
        self.getfield(L, -1, b'RunRootEffect')
        self.getglobal(L, b'_phase_construct_manager')
        self.check(self.call(L, 1, 0, 0, 0, None))
        if self.errors:
            raise RuntimeError(self.errors)

        executed = {row['row']: row for row in self.execution_rows}
        result = []
        for index in range(1, row_count + 1):
            if index in executed:
                result.append(executed[index])
            else:
                result.append({'row': index, 'passed': False, 'params': []})
        self.top(L, 0)
        self.getglobal(L, b'_phase_construct_manager'); self.getfield(L, -1, b'effectOrderFinished')
        if not bool(self.tobool(L, -1)):
            raise RuntimeError('Phase scheduler did not finish its root effect')
        return result

    def prepare_effect(self, index):
        """Run original TryDoEffect and return its resolved numeric parameters."""
        L = self.state
        self.top(L, 0)
        self.getglobal(L, b'_phase_generated_effects')
        self.rawgeti(L, -1, index)
        self.setglobal(L, b'_phase_current_effect')
        self.top(L, 0)
        self.getglobal(L, b'_phase_current_effect')
        self.getfield(L, -1, b'TryDoEffect')
        self.getglobal(L, b'_phase_current_effect')
        self.check(self.call(L, 1, 1, 0, 0, None))
        passed = bool(self.tobool(L, -1))
        self.top(L, 0)
        if self.errors:
            raise RuntimeError(self.errors)
        if not passed:
            return {'passed': False, 'params': []}
        self.getglobal(L, b'_phase_current_effect')
        self.getfield(L, -1, b'params')
        params = []
        for param_index in range(1, self.rawlen(L, -1) + 1):
            self.rawgeti(L, -1, param_index)
            if self.kind(L, -1) != 3:
                raise ValueError('Unexpected nonnumeric phase effect parameter')
            params.append(self.tonumber(L, -1, None))
            self.top(L, -2)
        return {'passed': True, 'params': params}
        self.getglobal(L, b'_phase_parser_subject')
        self.table(L, 1, 0)
        self.number(L, argument)
        self.rawseti(L, -2, 1)
        self.setfield(L, -2, b'skillArgs')
        self.boolean(L, bool(last_condition))
        self.setfield(L, -2, b'lastConditionRet')
        self.top(L, 0)

    def evaluate(self, expression):
        if isinstance(expression, (int, float)):
            return [expression]
        L = self.state
        self.top(L, 0)
        self.getglobal(L, b'_target_parser')
        self.getfield(L, -1, b'GetValueListByCmd')
        self.getglobal(L, b'_phase_parser_subject')
        self.pushstring(L, expression.encode())
        self.check(self.call(L, 2, 1, 0, 0, None))
        if self.errors:
            raise RuntimeError(self.errors)
        values = []
        for index in range(1, self.rawlen(L, -1) + 1):
            self.rawgeti(L, -1, index)
            tag = self.kind(L, -1)
            if tag == 1:
                values.append(bool(self.tobool(L, -1)))
            elif tag == 3:
                values.append(self.tonumber(L, -1, None))
            else:
                raise ValueError('Unexpected parser expression result')
            self.top(L, -2)
        return values

    def check_condition(self, expression):
        L = self.state
        self.top(L, 0)
        self.getglobal(L, b'_oracle_cmd')
        self.getfield(L, -1, b'CheckCondition')
        self.getglobal(L, b'_phase_command_subject')
        self.pushstring(L, expression.encode())
        self.check(self.call(L, 2, 1, 0, 0, None))
        if self.errors:
            raise RuntimeError(self.errors)
        return bool(self.tobool(L, -1))

    def expression(self, expression, argument, last_condition, max_hp):
        self.begin(argument, max_hp, getattr(self, 'layers', {}), last_condition)
        return self.evaluate(expression)
