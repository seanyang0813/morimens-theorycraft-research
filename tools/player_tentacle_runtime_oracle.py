"""Execute installed BattleUnitPlayer.GetTentacleDamage with explicit PvE adapters."""
import ctypes as C
import hashlib
import json
import random

from target_runtime_oracle import TargetOracle, ROOT


MODULE = ROOT / 'research/observations/current-res151-build51/modules/BattleUnitPlayer.lua'
CONSTANT = ROOT / 'research/observations/current-res151-build51/modules/Constant.json'
PLAYER_KEYS = ('tentacle_dmg', 'tentacle_base_dmg', 'basic_damage_per',
               'weak_per', 'tentacle_dmg_per')
AWAKER_KEYS = ('i_basic_damage_per', 'i_damage_per',
               *(f'i_damage_per{i}' for i in range(1, 9)))


class PlayerTentacleOracle(TargetOracle):
    def __init__(self):
        super().__init__()
        self.values = {}
        self.rawseti = self.lib.lua_rawseti
        self.rawseti.argtypes = [C.c_void_p, C.c_int, C.c_longlong]
        self.rawseti.restype = None
        self.gettop = self.lib.lua_gettop
        self.gettop.argtypes = [C.c_void_p]
        self.gettop.restype = C.c_int
        def require(s):
            name = self.string(s, 1, None)
            if name == b'System.System':
                self.getglobal(s, b'_oracle_config_system')
            elif name == b'Battle.BattleConst':
                self.getglobal(s, b'_oracle_bc')
            elif name == b'Battle.Util.BattleUtilServer':
                self.getglobal(s, b'_oracle_util')
            elif name.startswith(b'Battle.'):
                self.table(s, 0, 0)
            else:
                self.errors.append('Unexpected require: ' + repr(name))
                self.nil(s)
            return 1
        self.callback(require)
        self.setglobal(self.state, b'require')
        self.module('BattleUnitPlayer', {'output': str(MODULE.relative_to(ROOT))})
        self.setglobal(self.state, b'_tentacle_player_module')
        if self.errors:
            raise RuntimeError(self.errors)
        self._build_objects()

    def _build_objects(self):
        L = self.state
        self.table(L, 0, 1)
        def is_pve(s):
            self.boolean(s, 1)
            return 1
        def is_pvp(s):
            self.boolean(s, 0)
            return 1
        self.method('IsPVE', is_pve)
        self.method('IsPVP', is_pvp)
        def debug(s):
            return 0
        self.method('DebugS', debug)
        self.table(L, 0, 1)
        def get_constant(s):
            if self.string(s, 1, None) != b'TentacleDamageForPowerPercent':
                self.errors.append('Unexpected constant')
            self.number(s, self.values['powerAddPer'])
            return 1
        self.method('GetConstant', get_constant)
        self.setfield(L, -2, b'battleDT')
        self.setglobal(L, b'_tentacle_engine')

        self.table(L, 0, 5)
        self.getglobal(L, b'_tentacle_engine')
        self.setfield(L, -2, b'battleEngine')
        def property_get(s):
            key = self.string(s, 2, None).decode()
            if key not in PLAYER_KEYS:
                self.errors.append('Unexpected player property: ' + key)
            self.number(s, self.values['player'].get(key, 0))
            return 1
        self.method('GetProperty', property_get)
        def power(s):
            self.number(s, self.values['powerStateLayer'])
            return 1
        self.method('GetPowerStateLayer', power)
        def dimension(s):
            self.number(s, self.values['dimensionFixPer'])
            return 1
        self.method('GetDimensionFixPer', dimension)
        def awakers(s):
            self.table(s, len(self.values['awakers']), 0)
            for index, row in enumerate(self.values['awakers'], 1):
                self.table(s, 0, 1)
                def awaker_property(state, row=row):
                    key = self.string(state, 2, None).decode()
                    if key not in AWAKER_KEYS:
                        self.errors.append('Unexpected Awaker property: ' + key)
                    self.number(state, row.get(key, 0))
                    return 1
                self.method('GetProperty', awaker_property)
                self.rawseti(s, -2, index)
            return 1
        self.method('GetAwakerList', awakers)
        self.setglobal(L, b'_tentacle_player')

    def calculate(self, values):
        self.values = values
        self.errors.clear()
        L = self.state
        self.top(L, 0)
        self.getglobal(L, b'_tentacle_player_module')
        self.getfield(L, -1, b'GetTentacleDamage')
        self.getglobal(L, b'_tentacle_player')
        self.check(self.call(L, 1, 1, 0, 0, None))
        if self.errors:
            raise RuntimeError(self.errors)
        return self.tonumber(L, -1, None)


def main():
    constant = json.loads(CONSTANT.read_text(encoding='utf-8'))['TentacleDamageForPowerPercent']['Data'][0]
    if constant != -100:
        raise ValueError('Installed power constant changed')
    oracle = PlayerTentacleOracle()
    neutral = {'player': {key: 0 for key in PLAYER_KEYS}, 'awakers': [{key: 0 for key in AWAKER_KEYS}],
               'powerStateLayer': 0, 'powerAddPer': constant, 'dimensionFixPer': 0}
    cases = [neutral, {**neutral, 'player': {**neutral['player'],
             'tentacle_dmg': 38, 'tentacle_base_dmg': 103, 'basic_damage_per': 86}}]
    for key in PLAYER_KEYS:
        for value in (-100, -25, 0.1, 25, 50, 100, 200):
            cases.append({**neutral, 'player': {**neutral['player'], key: value}})
    for key in AWAKER_KEYS:
        for value in (-50, 0.1, 25, 100):
            cases.append({**neutral, 'awakers': [{**neutral['awakers'][0], key: value}]})
    rng = random.Random(20260922)
    for _ in range(300):
        count = rng.randrange(1, 5)
        cases.append({'player': {key: rng.choice((-50, 0, 0.1, 25, 50, 100, 200)) for key in PLAYER_KEYS},
                      'awakers': [{key: rng.choice((-50, 0, 0.1, 25, 50, 100)) for key in AWAKER_KEYS}
                                  for _ in range(count)],
                      'powerStateLayer': rng.choice((0, 1, 10)),
                      'powerAddPer': constant,
                      'dimensionFixPer': rng.choice((-50, 0, 25, 100))})
    output = {'kind': 'SYNTHETIC_INSTALLED_ORIGINAL_RUNTIME', 'build': 'pc-res151-build51',
              'method': 'BattleUnitPlayer.GetTentacleDamage',
              'sourceHash': hashlib.sha256(MODULE.read_bytes()).hexdigest(),
              'constantSourceHash': hashlib.sha256(CONSTANT.read_bytes()).hexdigest(),
              'fixtures': [{'input': row, 'expected': oracle.calculate(row)} for row in cases]}
    path = ROOT / 'tests/synthetic/installed-player-tentacle-damage.json'
    path.write_text(json.dumps(output, indent=2) + '\n', encoding='utf-8')
    print('Installed player Tentacle damage cases:', len(cases))


if __name__ == '__main__':
    main()
