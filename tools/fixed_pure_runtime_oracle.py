"""Execute original Fixed/Pure effect methods; intercept BeHit before HP resolution."""
import json
import random
from passive_runtime_oracle import PassiveOracle, ROOT

for category in ['Fixed', 'Pure']:
    oracle = PassiveOracle('BE' + category + 'Damage')
    neutral = dict(baseDamage=100, dimensionFixPer=0, targetDead=False)
    if category == 'Fixed':
        neutral.update({f'fixed{i}': 0 for i in range(1, 6)})
    cases = [neutral, {**neutral, 'targetDead': True}]
    for key in [k for k in neutral if k != 'targetDead']:
        for value in [-150, -100, -99.9, -0.1, 0, 0.1, 1, 33.333, 100, 1000]:
            cases.append({**neutral, key: value})
    rng = random.Random(20260921)
    for _ in range(300):
        values = {**neutral, 'baseDamage': rng.uniform(-100, 100000),
                  'dimensionFixPer': rng.choice([-150, -100, -50, 0, 25, 100])}
        if category == 'Fixed':
            values.update({f'fixed{i}': rng.choice([-100, -25, 0, 0.1, 50]) for i in range(1, 6)})
        cases.append(values)
    fixtures = [{'id': f'{category.lower()}-{i}', 'input': v, 'expected': oracle.evaluate(v)} for i, v in enumerate(cases)]
    result = {'kind': 'SYNTHETIC_ORIGINAL_RUNTIME', 'build': 'pc-res144-build51',
              'scope': 'Original effect __DoMultiEffect; explicit property and dimension adapters; intercepted BeHit; no HP, events, or statistics',
              'sourceHashes': {n: oracle.assets[n+'.lua']['sha256'] for n in ['BE'+category+'Damage', 'BattleEffectServer']},
              'fixtures': fixtures}
    path = ROOT / f'tests/synthetic/original-{category.lower()}-runtime.json'
    path.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(category, len(fixtures), 'original-runtime cases')
