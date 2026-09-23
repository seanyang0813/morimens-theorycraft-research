"""Execute the installed SchoolCompPVE Tentacle calculation with synthetic adapters.

This stops before BeHit and does not reconstruct cards, status callbacks or gameplay.
"""
import ctypes as C
import hashlib
import json
import random

from target_runtime_oracle import TargetOracle, ROOT


SOURCE = ROOT / 'research/observations/current-res151-build51/modules/SchoolCompPVE.lua'


class TentacleOracle(TargetOracle):
    def __init__(self):
        super().__init__()
        self.values = {}
        self.rawseti = self.lib.lua_rawseti
        self.rawseti.argtypes = [C.c_void_p, C.c_int, C.c_longlong]
        self.rawseti.restype = None
        self.toboolean = self.lib.lua_toboolean
        self.toboolean.argtypes = [C.c_void_p, C.c_int]
        self.toboolean.restype = C.c_int
        self.table(self.state, 0, 2)
        for method, key in [('GetTentacleCrit', 'tentacleCrit'), ('GetTentacleCritDmg', 'tentacleCritDmg')]:
            def value(s, key=key):
                self.number(s, self.values[key])
                return 1
            self.method(method, value)
        self.setglobal(self.state, b'_tentacle_zone_util')

        def require(s):
            name = self.string(s, 1, None)
            known = {b'System.System': b'_oracle_config_system',
                     b'Battle.BattleConst': b'_oracle_bc',
                     b'Battle.Util.BattleZoneUtil': b'_tentacle_zone_util'}
            if name in known:
                self.getglobal(s, known[name])
            elif name == b'Battle.Ecs.BattleComponent':
                self.table(s, 0, 0)
            else:
                self.errors.append('Unexpected dependency: ' + repr(name))
                self.nil(s)
            return 1
        self.callback(require)
        self.setglobal(self.state, b'require')
        self.module('SchoolCompPVE', {'output': str(SOURCE.relative_to(ROOT))})
        self.setglobal(self.state, b'_tentacle_module')
        if self.errors:
            raise RuntimeError(self.errors)
        self._build_objects()

    def _build_objects(self):
        L = self.state

        def property_get(mapping):
            def get(s):
                key = self.string(s, 2, None)
                if key not in mapping:
                    self.errors.append('Unexpected property: ' + repr(key))
                    self.number(s, 0)
                else:
                    self.number(s, self.values[mapping[key]])
                return 1
            return get

        self.table(L, 0, 1)
        self.method('GetProperty', property_get({b'certain_crit': 'certainCrit'}))
        self.setglobal(L, b'_tentacle_role')

        target_properties = {
            b'anti_crit': 'antiCrit', b'be_damage_per': 'beDamagePer',
            b'be_damage_per2': 'beDamagePer2', b'be_damage_per3': 'beDamagePer3',
            b'be_tentacle_damage_per': 'beTentacleDamagePer',
            b'vulnerable_per': 'vulnerablePer', b'be_damage_plus': 'beDamagePlus'}
        self.table(L, 0, 1)
        self.method('GetProperty', property_get(target_properties))
        self.setglobal(L, b'_tentacle_target')

        self.table(L, 0, 7)
        for method, key in [('GetDamagePer2MonsterType', 'enemyTypePer'),
                            ('GetDamagePer2BuffEnemy', 'enemyBuffPer'),
                            ('GetDamagePer2DebuffEnemy', 'enemyDebuffPer'),
                            ('GetDamagePer2Block', 'enemyBlockPer'),
                            ('GetDamagePer2BlockBarrier', 'enemyBarrierPer')]:
            def value(s, key=key):
                self.number(s, self.values[key])
                return 1
            self.method(method, value)
        def state_bonus(s):
            self.number(s, self.values['enemyStatePer'])
            self.setfield(s, 3, b'state_bonus')
            return 0
        self.method('GetTotalDamagePer2HasState', state_bonus)
        self.setglobal(L, b'_tentacle_awaker')

        self.table(L, 0, 1)
        def awakers(s):
            self.table(s, 1, 0)
            self.getglobal(s, b'_tentacle_awaker')
            self.rawseti(s, -2, 1)
            return 1
        self.method('GetAwakerList', awakers)
        self.setglobal(L, b'_tentacle_player')

        self.table(L, 0, 1)
        def player(s):
            self.getglobal(s, b'_tentacle_player')
            return 1
        self.method('GetPlayer', player)
        self.setglobal(L, b'_tentacle_role_mgr')

        self.table(L, 0, 1)
        def random_draw(s):
            self.number(s, 1)
            return 1
        self.method('random', random_draw)
        self.setglobal(L, b'_tentacle_rand')

        self.table(L, 0, 2)
        self.getglobal(L, b'_tentacle_role_mgr')
        self.setfield(L, -2, b'roleMgr')
        self.getglobal(L, b'_tentacle_rand')
        self.setfield(L, -2, b'rand')
        self.setglobal(L, b'_tentacle_engine')

        self.table(L, 0, 3)
        self.getglobal(L, b'_tentacle_role')
        self.setfield(L, -2, b'role')
        self.getglobal(L, b'_tentacle_engine')
        self.setfield(L, -2, b'battleEngine')
        self.getglobal(L, b'_tentacle_module')
        self.getfield(L, -1, b'CalcTentacleCrit')
        self.setfield(L, -3, b'CalcTentacleCrit')
        self.getfield(L, -1, b'GetTentacleCrit')
        self.setfield(L, -3, b'GetTentacleCrit')
        self.getfield(L, -1, b'GetTentacleCritDmg')
        self.setfield(L, -3, b'GetTentacleCritDmg')
        self.top(L, -2)
        self.setglobal(L, b'_tentacle_self')
        self.top(L, 0)

    def calculate(self, values):
        self.values = values
        self.errors.clear()
        L = self.state
        self.top(L, 0)
        self.getglobal(L, b'_tentacle_module')
        self.getfield(L, -1, b'CalcTentacleDmg')
        self.getglobal(L, b'_tentacle_self')
        self.number(L, values['baseDamage'])
        self.getglobal(L, b'_tentacle_target')
        self.number(L, values['paraPlus'])
        self.check(self.call(L, 4, 2, 0, 0, None))
        if self.errors:
            raise RuntimeError(self.errors)
        return {'preHitDamage': self.tonumber(L, -2, None),
                'isCrit': bool(self.toboolean(L, -1))}


def main():
    oracle = TentacleOracle()
    neutral = dict(baseDamage=100, paraPlus=0, certainCrit=0, tentacleCrit=0,
                   tentacleCritDmg=150, antiCrit=0, beDamagePer=0, beDamagePer2=0,
                   beDamagePer3=0, beTentacleDamagePer=0, vulnerablePer=0,
                   beDamagePlus=0, enemyTypePer=0, enemyStatePer=0,
                   enemyBuffPer=0, enemyDebuffPer=0, enemyBlockPer=0,
                   enemyBarrierPer=0)
    cases = [neutral, {**neutral, 'certainCrit': 1}]
    for key in neutral:
        if key in ('certainCrit', 'tentacleCrit'):
            continue
        for value in (-100, -25, 0.1, 20, 50, 100, 200):
            cases.append({**neutral, key: value})
    rng = random.Random(20260922)
    for _ in range(300):
        case = {**neutral, 'baseDamage': rng.uniform(-50, 100000),
                'paraPlus': rng.choice((-100, 0, 25, 100)),
                'certainCrit': rng.randrange(2)}
        for key in rng.sample(tuple(k for k in neutral if k not in
                                    ('baseDamage', 'paraPlus', 'certainCrit', 'tentacleCrit')),
                              rng.randrange(1, 7)):
            case[key] = rng.choice((-50, -25, 0.1, 12.5, 25, 50, 100))
        cases.append(case)
    report = {'kind': 'SYNTHETIC_INSTALLED_ORIGINAL_RUNTIME',
              'build': 'pc-res151-build51',
              'scope': 'Original SchoolCompPVE.CalcTentacleDmg with explicit one-Awakener properties and deterministic critical branch; no effect, BeHit, HP or gameplay',
              'sourceHash': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
              'fixtures': [{'input': x, 'expected': oracle.calculate(x)} for x in cases]}
    path = ROOT / 'tests/synthetic/installed-tentacle-prehit.json'
    path.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print('Original installed Tentacle cases:', len(cases))


if __name__ == '__main__':
    main()
