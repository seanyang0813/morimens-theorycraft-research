"""Original ImmueDamage predicate with explicit properties and damage category."""
import itertools
import json
from behit_hp_oracle import BeHitHpOracle, ROOT

class ImmunityOracle(BeHitHpOracle):
    def evaluate_immunity(self, v):
        L = self.state
        self.top(L, 0)
        self.getglobal(L, b'_hp_property')
        self.table(L, 0, 7)
        properties = {'immue_damage': v['general'], 'immue_puncture_damage': v['punctureImmunity']}
        properties.update({f'immue_{category.lower()}_damage': v['categoryImmunities'][category] for category in v['categoryImmunities']})
        for key, value in properties.items():
            self.number(L, value)
            self.setfield(L, -2, key.encode())
        self.setfield(L, -2, b'properties')
        self.top(L, 0)
        self.getglobal(L, b'_behit_unit')
        self.getfield(L, -1, b'ImmueDamage')
        self.getglobal(L, b'_behit_unit')
        self.table(L, 0, 2)
        self.enum('DamageType', v['category'])
        self.setfield(L, -2, b'damageType')
        if v['puncture']:
            self.enum('DamageSubType', 'Puncture')
        else:
            self.number(L, 0)
        self.setfield(L, -2, b'damageSubType')
        self.check(self.call(L, 2, 1, 0, 0, None))
        return bool(self.tobool(L, -1))

if __name__ == '__main__':
    oracle = ImmunityOracle()
    categories = ['Active', 'Passive', 'Fixed', 'Pure', 'Tentacle']
    fixtures = []
    for category, puncture, general, puncture_immunity, specific in itertools.product(categories, [False, True], [-1, 0, .1], [-1, 0, .1], [-1, 0, .1]):
        # Other-category immunities are enabled deliberately to check isolation.
        values = dict(category=category, puncture=puncture, general=general,
                      punctureImmunity=puncture_immunity,
                      categoryImmunities={c: specific if c == category else 1 for c in categories})
        fixtures.append({'input': values, 'expected': oracle.evaluate_immunity(values)})
    out = {'kind': 'SYNTHETIC_ORIGINAL_RUNTIME', 'build': 'pc-res144-build51',
           'scope': 'Original BattleUnitBase.ImmueDamage with explicit properties; subtype 0 or Puncture; no HP or event execution',
           'sourceHashes': {'BattleUnitBase': oracle.assets['BattleUnitBase.lua']['sha256']}, 'fixtures': fixtures}
    (ROOT/'tests/synthetic/original-immunity.json').write_text(json.dumps(out, indent=2)+'\n', encoding='utf-8')
    print('Generated', len(fixtures), 'original immunity cases')
