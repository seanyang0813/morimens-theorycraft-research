"""Execute selected original monster death-path methods with explicit adapters."""
import ctypes as C
import json

from target_runtime_oracle import TargetOracle, ROOT


class DeathPathOracle(TargetOracle):
    def __init__(self, asset_overrides=None):
        asset_overrides = asset_overrides or {}
        super().__init__(asset_overrides)
        L = self.state
        self.kind = self.lib.lua_type
        self.kind.argtypes = [C.c_void_p, C.c_int]
        self.kind.restype = C.c_int
        self.tobool = self.lib.lua_toboolean
        self.tobool.argtypes = [C.c_void_p, C.c_int]
        self.tobool.restype = C.c_int

        self.table(L, 0, 2)
        self.method('DoEffect', lambda state: 0)
        self.setglobal(L, b'_death_effect_super')
        self.table(L, 0, 0)
        self.setglobal(L, b'_death_unit_super')
        self.table(L, 0, 1)
        self.number(L, 901)
        self.setfield(L, -2, b'lg_Confirm')
        self.setglobal(L, b'_death_commands')
        self.table(L, 0, 1)
        self.number(L, 902)
        self.setfield(L, -2, b'ConfirmRespawn')
        self.setglobal(L, b'_death_events')

        self.getglobal(L, b'_oracle_config_system')
        def new_class(state):
            name = self.string(state, 1, None)
            self.table(state, 0, 20)
            self.getglobal(state, b'_death_effect_super' if name == b'BERoleDie' else b'_death_unit_super')
            return 2
        self.method('NewClass', new_class)
        self.top(L, 0)

        known = {
            b'System.System': b'_oracle_config_system',
            b'Battle.BattleConst': b'_oracle_bc',
            b'Battle.DbgEngine.Effect.BattleEffectServer': b'_death_effect_super',
            b'Battle.DbgEngine.Event.BattleCommand': b'_death_commands',
            b'Battle.DbgEngine.Event.BattleLogicEvent': b'_death_events',
            b'Battle.DbgEngine.Role.BattleUnitBase': b'_death_unit_super',
            b'Battle.Util.BattleUtilServer': b'_oracle_util',
        }
        empty = {
            b'Battle.DbgEngine.Role.Component.MonsterBehaviorComp',
            b'Battle.Util.PathUtils',
            b'Battle.DbgEngine.Role.Component.SchoolCompPVE',
            b'Battle.DbgEngine.Role.Component.SchoolCompPVP',
            b'Battle.DbgEngine.Stats.BattleStatsMgrPVP',
            b'Battle.DbgEngine.Card.BattleKeeperSkillServer',
            b'Battle.DbgEngine.Cmd.BattleCmdParser',
        }
        def require(state):
            name = self.string(state, 1, None)
            if name in known:
                self.getglobal(state, known[name])
            elif name in empty:
                self.table(state, 0, 0)
            else:
                self.errors.append('Unexpected death dependency: ' + repr(name))
                self.nil(state)
            return 1
        self.callback(require)
        self.setglobal(L, b'require')
        self.module('BERoleDie', asset_overrides.get('BERoleDie'))
        self.setglobal(L, b'_role_die_effect')
        self.module('BattleUnitMonster', asset_overrides.get('BattleUnitMonster'))
        self.setglobal(L, b'_monster_class')
        self.module('BattleUnitPlayer', asset_overrides.get('BattleUnitPlayer'))
        self.setglobal(L, b'_player_class')
        if self.errors:
            raise RuntimeError(self.errors)

    def run_die(self, case):
        self.case = case
        self.trace = []
        L = self.state
        self.top(L, 0)
        self.getglobal(L, b'_role_die_effect')
        self.number(L, 88)
        self.setfield(L, -2, b'uid')
        self.table(L, 0, 5)
        for key, value in {'roleUid': 7, 'castRoleUid': 9, 'sourceCardUid': 10, 'fromCmdServerUid': 11}.items():
            self.number(L, value)
            self.setfield(L, -2, key.encode())
        self.setfield(L, -2, b'effectConfig')

        self.table(L, 0, 8)
        self.number(L, case['camp'])
        self.setfield(L, -2, b'camp')
        self.table(L, 0, 1)
        self.number(L, case['lives'])
        self.setfield(L, -2, b'lives')
        self.setfield(L, -2, b'data')
        def get_property(state):
            self.number(state, case['hp'])
            return 1
        def respawn(state):
            self.trace.append('Respawn')
            return 0
        def role_die(state):
            row = {'event': 'RoleDie'}
            for name in ('castRoleUid', 'sourceCardUid', 'cmdServerUid'):
                self.getfield(state, 2, name.encode())
                row[name] = self.tonumber(state, -1, None)
                self.top(state, -2)
            self.trace.append(row)
            return 0
        self.method('GetProperty', get_property)
        self.method('Respawn', respawn)
        self.method('RoleDie', role_die)
        self.setglobal(L, b'_death_role')

        self.table(L, 0, 10)
        def get_obj(state):
            if case['roleExists']:
                self.getglobal(state, b'_death_role')
            else:
                self.nil(state)
            return 1
        def get_data(state):
            name = self.string(state, 2, None)
            if name == b'isIntro':
                self.boolean(state, case['isIntro'])
            elif name == b'respawnCost':
                self.number(state, case['respawnCost'])
            else:
                self.nil(state)
            return 1
        def is_pve(state):
            self.boolean(state, case['isPve'])
            return 1
        def battle_end(state):
            self.trace.append('ActiveBattleEnd')
            return 0
        self.method('GetObj', get_obj)
        self.method('GetData', get_data)
        self.method('IsPVE', is_pve)
        self.method('ActiveBattleEnd', battle_end)
        self.table(L, 0, 1)
        def confirm(state):
            self.trace.append('Confirm')
            return 0
        self.method('OnConfirm', confirm)
        self.setfield(L, -2, b'recordMgr')
        self.table(L, 0, 1)
        def yield_effect(state):
            self.trace.append('Yield')
            return 0
        self.method('Yield', yield_effect)
        self.setfield(L, -2, b'effectMgr')
        self.setglobal(L, b'_death_engine')
        self.getglobal(L, b'_death_role')
        self.getglobal(L, b'_death_engine')
        self.setfield(L, -2, b'battleEngine')
        self.top(L, 0)
        for method_name in (b'CanPVERespawn', b'CanUseFirstFreeRespawn'):
            self.getglobal(L, b'_death_role')
            self.getglobal(L, b'_player_class' if case['camp'] == 1 else b'_monster_class')
            self.getfield(L, -1, method_name)
            if self.kind(L, -1) != 0:
                self.setfield(L, -3, method_name)
                self.top(L, -2)
            else:
                self.top(L, -3)
            self.top(L, 0)
        self.getglobal(L, b'_role_die_effect')
        self.getglobal(L, b'_death_engine')
        self.setfield(L, -2, b'battleEngine')
        self.top(L, 0)

        self.getglobal(L, b'_role_die_effect')
        self.getfield(L, -1, b'DoEffect')
        self.getglobal(L, b'_role_die_effect')
        self.check(self.call(L, 1, 1, 0, 0, None))
        kind = self.kind(L, -1)
        if kind == 1:
            returned = bool(self.tobool(L, -1))
        elif kind == 3:
            returned = self.tonumber(L, -1, None)
        elif kind == 4:
            returned = self.string(L, -1, None).decode()
        else:
            returned = None
        self.top(L, 0)
        if self.errors:
            raise RuntimeError(self.errors)
        return {'returnValue': returned, 'trace': self.trace}

    def monster_precheck(self):
        L = self.state
        self.top(L, 0)
        self.getglobal(L, b'_monster_class')
        self.getfield(L, -1, b'PreCheckDeathEvent')
        self.getglobal(L, b'_monster_class')
        self.check(self.call(L, 1, 1, 0, 0, None))
        result = bool(self.tobool(L, -1))
        self.top(L, 0)
        return result


CASES = [
    {'name': 'missing-role', 'roleExists': False, 'hp': 0, 'camp': 2, 'lives': 1, 'isPve': True, 'isIntro': False, 'respawnCost': 1},
    {'name': 'revived-before-die', 'roleExists': True, 'hp': 1, 'camp': 2, 'lives': 1, 'isPve': True, 'isIntro': False, 'respawnCost': 1},
    {'name': 'monster-dies', 'roleExists': True, 'hp': 0, 'camp': 2, 'lives': 1, 'isPve': True, 'isIntro': False, 'respawnCost': 1},
    {'name': 'player-can-respawn', 'roleExists': True, 'hp': 0, 'camp': 1, 'lives': 2, 'isPve': True, 'isIntro': False, 'respawnCost': 1},
    {'name': 'intro-auto-respawn', 'roleExists': True, 'hp': 0, 'camp': 1, 'lives': 1, 'isPve': True, 'isIntro': True, 'respawnCost': 1},
    {'name': 'player-confirm-no-spare-life', 'roleExists': True, 'hp': 0, 'camp': 1, 'lives': 1, 'isPve': True, 'isIntro': False, 'respawnCost': 1},
    {'name': 'pvp-role-dies', 'roleExists': True, 'hp': 0, 'camp': 1, 'lives': 2, 'isPve': False, 'isIntro': False, 'respawnCost': 1},
]


def main():
    oracle = DeathPathOracle()
    fixtures = [{'input': case, 'expected': oracle.run_die(case)} for case in CASES]
    report = {
        'kind': 'SYNTHETIC_ORIGINAL_RUNTIME',
        'build': 'pc-res144-build51',
        'sourceHashes': {name: oracle.assets[name + '.lua']['sha256'] for name in ('BERoleDie', 'BattleUnitMonster', 'BattleUnitPlayer', 'BattleConst')},
        'scope': 'Original BERoleDie.DoEffect over missing/revived/monster/PvE-player/PvP branches plus BattleUnitMonster.PreCheckDeathEvent. Explicit HP, camp, lives, intro, respawn-cost and mode adapters; record/yield/respawn/death/battle-end calls observed. No OnConfirm, RoleDie internals, scheduler, event listeners, gameplay or holdout.',
        'monsterPreCheckDeathEvent': oracle.monster_precheck(),
        'fixtures': fixtures,
    }
    path = ROOT / 'tests/synthetic/original-role-die.json'
    path.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8', newline='\n')
    print('Generated', len(fixtures), 'role-die cases')


if __name__ == '__main__':
    main()
