"""Original BeHit category paths; downstream event/record hooks disabled."""
import json
from behit_hp_oracle import BeHitHpOracle, ROOT
oracle = BeHitHpOracle()
base = dict(damage=200, block=0, puncture=False, hp=100, immune=False,
            preventEligible=False, retainHp=0, limit=0, usedLimit=0, deathResist=0)
changes = [{}, dict(block=50), dict(block=300), dict(limit=33, usedLimit=30),
           dict(immune=True), dict(preventEligible=True, retainHp=90), dict(deathResist=1)]
fixtures = []
for category in ['Fixed', 'Pure']:
    variants = changes + ([dict(immune=True, puncture=True, block=50)] if category == 'Fixed' else [])
    for change in variants:
        values = {**base, **change, 'damageType': category}
        fixtures.append({'input': values, 'expected': oracle.evaluate(values)})
out = {'kind': 'SYNTHETIC_ORIGINAL_RUNTIME', 'build': 'pc-res144-build51',
       'scope': 'Original BeHit and HP property mutation; explicit properties; record, animation and damage-event hooks disabled; not an end-to-end effect execution',
       'sourceHashes': {n: oracle.assets[n+'.lua']['sha256'] for n in ['BattleUnitBase', 'BattleUnitUtil', 'BattlePropertyServer']},
       'fixtures': fixtures}
(ROOT/'tests/synthetic/original-fixed-pure-hp.json').write_text(json.dumps(out, indent=2)+'\n', encoding='utf-8')
print('Generated', len(fixtures), 'Fixed/Pure HP cases')
