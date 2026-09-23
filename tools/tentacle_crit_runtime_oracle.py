"""Execute installed BattleZoneUtil.GetTentacleCritDmg with explicit region/role adapters."""
import ctypes as C
import hashlib
import json
import random

from target_runtime_oracle import TargetOracle, ROOT


SOURCE = ROOT / 'research/observations/current-res151-build51/modules/BattleZoneUtil.lua'


class TentacleCritOracle(TargetOracle):
    def __init__(self):
        super().__init__()
        self.values = {}
        self.rawseti = self.lib.lua_rawseti
        self.rawseti.argtypes = [C.c_void_p, C.c_int, C.c_longlong]
        self.rawseti.restype = None
        def require(s):
            name = self.string(s, 1, None)
            if name != b'Battle.BattleConst':
                self.errors.append('Unexpected dependency: ' + repr(name))
            self.getglobal(s, b'_oracle_bc')
            return 1
        self.callback(require)
        self.setglobal(self.state, b'require')
        self.module('BattleZoneUtil', {'output': str(SOURCE.relative_to(ROOT))})
        self.setglobal(self.state, b'_tentacle_zone')
        L = self.state
        self.getglobal(L, b'_tentacle_zone')
        def japan(s):
            self.boolean(s, self.values['japan'])
            return 1
        self.method('IsJapan', japan)
        self.top(L, 0)
        self.table(L, 0, 2)
        def outside(s):
            if self.string(s, 2, None) != b'outside_crit_damage':
                self.errors.append('Unexpected Player property')
            self.number(s, self.values['outsideCritDamage'])
            return 1
        self.method('GetProperty', outside)
        def awakers(s):
            self.table(s, len(self.values['awakerCritDamage']), 0)
            for index, value in enumerate(self.values['awakerCritDamage'], 1):
                self.table(s, 0, 1)
                def property_get(state, value=value):
                    if self.string(state, 2, None) != b'crit_damage':
                        self.errors.append('Unexpected Awaker property')
                    self.number(state, value)
                    return 1
                self.method('GetProperty', property_get)
                self.rawseti(s, -2, index)
            return 1
        self.method('GetAwakerList', awakers)
        self.setglobal(L, b'_tentacle_player')

    def calculate(self, values):
        self.values = values
        self.errors.clear()
        L = self.state
        self.top(L, 0)
        self.getglobal(L, b'_tentacle_zone')
        self.getfield(L, -1, b'GetTentacleCritDmg')
        self.getglobal(L, b'_tentacle_player')
        self.check(self.call(L, 1, 1, 0, 0, None))
        if self.errors:
            raise RuntimeError(self.errors)
        return self.tonumber(L, -1, None)


def main():
    oracle = TentacleCritOracle()
    cases = [{'japan': japan, 'outsideCritDamage': outside, 'awakerCritDamage': awakers}
             for japan in (False, True)
             for outside, awakers in ((0, [0]), (84, [219, 115, 72, 50]),
                                      (0.2, [50.1, 50.2]), (-5, [100]))]
    rng = random.Random(20260923)
    for _ in range(300):
        cases.append({'japan': bool(rng.randrange(2)),
                      'outsideCritDamage': rng.choice((-50, 0, 0.1, 25, 84, 100, 150)),
                      'awakerCritDamage': [rng.choice((-25, 0, 0.1, 50, 72, 100, 150, 219))
                                           for _ in range(rng.randrange(1, 5))]})
    report = {'kind': 'SYNTHETIC_INSTALLED_ORIGINAL_RUNTIME',
              'build': 'pc-res151-build51', 'method': 'BattleZoneUtil.GetTentacleCritDmg',
              'sourceHash': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
              'fixtures': [{'input': row, 'expected': oracle.calculate(row)} for row in cases]}
    path = ROOT / 'tests/synthetic/installed-tentacle-crit-damage.json'
    path.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print('Installed Tentacle critical-damage cases:', len(cases))


if __name__ == '__main__':
    main()
