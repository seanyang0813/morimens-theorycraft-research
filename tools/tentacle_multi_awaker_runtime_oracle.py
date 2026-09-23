"""Exercise installed Tentacle aggregation with one to four synthetic Awakeners."""
import hashlib
import json
import random

from tentacle_runtime_oracle import TentacleOracle, SOURCE, ROOT


AVERAGED_KEYS = ('enemyTypePer', 'enemyBuffPer', 'enemyDebuffPer',
                 'enemyBlockPer', 'enemyBarrierPer')
NEUTRAL = dict(baseDamage=100, paraPlus=0, certainCrit=0, tentacleCrit=0,
               tentacleCritDmg=150, antiCrit=0, beDamagePer=0, beDamagePer2=0,
               beDamagePer3=0, beTentacleDamagePer=0, vulnerablePer=0,
               beDamagePlus=0)


def row(state_bonuses=None, **changes):
    return {**dict.fromkeys(AVERAGED_KEYS, 0),
            'stateBonuses': state_bonuses or {}, **changes}


def main():
    oracle = TentacleOracle()
    cases = []
    for count in (1, 2, 3, 4):
        for key in AVERAGED_KEYS:
            for value in (-50, 25, 100):
                cases.append({**NEUTRAL, 'awakers': [row(**{key: value})] +
                              [row() for _ in range(count-1)]})
                cases.append({**NEUTRAL, 'awakers': [row(**{key: value}) for _ in range(count)]})
        for value in (0, 25, 100):
            cases.append({**NEUTRAL, 'awakers':
                          [row(state_bonuses={'state_a': value})] +
                          [row() for _ in range(count-1)]})
            cases.append({**NEUTRAL, 'awakers':
                          [row(state_bonuses={'state_a': value}) for _ in range(count)]})
    cases += [
        {**NEUTRAL, 'awakers': [row(state_bonuses={'state_a': 20}),
                               row(state_bonuses={'state_b': 30})]},
        {**NEUTRAL, 'awakers': [row(state_bonuses={'state_a': 20}),
                               row(state_bonuses={'state_a': 30}),
                               row(state_bonuses={'state_b': 40})]},
    ]
    rng = random.Random(20260923)
    for _ in range(200):
        count = rng.randrange(1, 5)
        cases.append({**NEUTRAL,
                      'baseDamage': rng.uniform(1, 1000),
                      'vulnerablePer': rng.choice((0, 20, 50)),
                      'beTentacleDamagePer': rng.choice((0, 10, 30)),
                      'awakers': [row(state_bonuses={key: rng.choice((0, 10, 25, 100))
                                                     for key in ('state_a', 'state_b', 'state_c')
                                                     if rng.randrange(2)},
                                      **{key: rng.choice((-50, 0, 10, 25, 100))
                                         for key in AVERAGED_KEYS})
                                   for _ in range(count)]})
    fixture = {'kind': 'SYNTHETIC_INSTALLED_ORIGINAL_RUNTIME',
               'build': 'pc-res151-build51',
               'scope': 'Original SchoolCompPVE.CalcTentacleDmg with one to four synthetic Awakeners; explicit resolved bonuses, deterministic noncritical branch; no gameplay',
               'sourceHash': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
               'fixtures': [{'input': case, 'expected': oracle.calculate(case)}
                            for case in cases]}
    path = ROOT / 'tests/synthetic/installed-tentacle-multi-awaker.json'
    path.write_text(json.dumps(fixture, indent=2) + '\n', encoding='utf-8')
    print('Original installed multi-Awakener Tentacle cases:', len(cases))


if __name__ == '__main__':
    main()
