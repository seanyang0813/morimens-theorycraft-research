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
        for name in ('GetValueByCmd', 'CheckCondition', 'GenerateEffectList'):
            self.getglobal(L, b'_oracle_cmd')
            self.getfield(L, -1, name.encode())
            self.setfield(L, -3, name.encode())
            self.top(L, -2)
        self.getglobal(L, b'_phase_parser_subject')
        self.setfield(L, -2, b'cmdParser')
        self.number(L, 1); self.setfield(L, -2, b'skillConfigId')

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

        def generate_effect(state):
            self.generated_rows.append(int(self.tonumber(state, 5, None)))
            self.table(state, 0, 0)
            return 1

        self.method('GetSkillArgs', get_skill_args)
        self.method('GetEffectDelayTimes', get_delays)
        self.method('GenerateEffectObj', generate_effect)
        self.getglobal(L, b'_phase_parser_subject')
        self.getfield(L, -1, b'battleEngine')
        self.setglobal(L, b'_phase_shared_engine')
        self.top(L, -2)
        self.getglobal(L, b'_phase_shared_engine')
        self.method('LogBattleWithTab', lambda state: 0)
        self.setfield(L, -2, b'battleEngine')
        self.setglobal(L, b'_phase_command_subject')

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
        self.generated_rows = []
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
        self.top(L, 0)

        self.getglobal(L, b'_oracle_cmd')
        self.getfield(L, -1, b'GenerateEffectList')
        self.getglobal(L, b'_phase_command_subject')
        self.nil(L)
        self.boolean(L, False)
        self.check(self.call(L, 3, 1, 0, 0, None))
        if self.errors:
            raise RuntimeError(self.errors)
        if self.generated_rows != list(range(1, len(ordered) + 1)):
            raise RuntimeError('GenerateEffectList did not preserve configured row order')
        return self.generated_rows
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
