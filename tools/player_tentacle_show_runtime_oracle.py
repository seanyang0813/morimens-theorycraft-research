"""Compare a show-damage formula to the installed original PvE Lua method."""
import hashlib
import json
import random

from player_tentacle_runtime_oracle import PlayerTentacleOracle, PLAYER_KEYS, AWAKER_KEYS, MODULE, ROOT


def calculate_show(oracle, values):
    oracle.values = values
    oracle.errors.clear()
    state = oracle.state
    oracle.top(state, 0)
    oracle.getglobal(state, b'_tentacle_player_module')
    oracle.getfield(state, -1, b'GetShowTentacleDamage')
    oracle.getglobal(state, b'_tentacle_player')
    oracle.check(oracle.call(state, 1, 1, 0, 0, None))
    if oracle.errors:
        raise RuntimeError(oracle.errors)
    return oracle.tonumber(state, -1, None)


def main():
    oracle = PlayerTentacleOracle()
    rng = random.Random(20260923)
    cases = []
    for count in range(5):
        for _ in range(60):
            player = {key: rng.choice((-75, -25, 0, 0.1, 25, 100, 200)) for key in PLAYER_KEYS}
            awakers = [{key: rng.choice((-50, 0, 25, 100)) for key in AWAKER_KEYS} for _ in range(count)]
            values = {'player': player, 'awakers': awakers, 'powerStateLayer': 0,
                      'powerAddPer': -100, 'dimensionFixPer': 0}
            visible_player = {key: player[key] for key in ('tentacle_dmg', 'tentacle_base_dmg',
                                                          'basic_damage_per', 'tentacle_dmg_per')}
            visible_awakers = [{'i_basic_damage_per': row['i_basic_damage_per']} for row in awakers]
            cases.append({'input': {'playerProperties': visible_player, 'awakerProperties': visible_awakers},
                          'expected': calculate_show(oracle, values)})
    output = {'kind': 'SYNTHETIC_INSTALLED_ORIGINAL_RUNTIME', 'build': 'pc-res151-build51',
              'method': 'BattleUnitPlayer.GetShowTentacleDamage',
              'sourceHash': hashlib.sha256(MODULE.read_bytes()).hexdigest(), 'fixtures': cases,
              'scope': 'Synthetic original Lua executions of the PvE show-damage method, not combat damage or gameplay validation'}
    path = ROOT / 'tests/synthetic/installed-player-tentacle-show-damage.json'
    path.write_text(json.dumps(output, indent=2) + '\n', encoding='utf-8')
    print('Installed Tentacle show cases:', len(cases))


if __name__ == '__main__':
    main()
