"""Run original PC FuncTable expressions for Arachne realm stack counts.

Explicit final mastery only; not a party builder or gameplay observation.
"""
import json
from runtime_oracle import Oracle, ROOT


class SingularityLayerOracle(Oracle):
    def __init__(self):
        super().__init__()
        self.module('FuncTable')
        self.setglobal(self.state, b'_realm_expressions')
        commands = json.loads((ROOT/'research/extracted/config/Cmd.json').read_text(encoding='utf-8'))
        self.expressions = {
            'prism': commands['133367']['data_list']['1']['Para'],
            'beacon': commands['134388']['data_list']['1']['Para'],
        }

    def evaluate(self, mastery):
        result = {}
        for kind, expression in self.expressions.items():
            L = self.state
            self.top(L, 0)
            self.getglobal(L, b'_realm_expressions')
            self.getfield(L, -1, expression.encode())
            self.table(L, 0, 2)
            self.getglobal(L, b'math')
            self.setfield(L, -2, b'math')
            self.table(L, 0, 1)
            self.number(L, mastery)
            self.setfield(L, -2, b'occupation_master_final')
            self.setfield(L, -2, b'PlayerRole')
            self.check(self.call(L, 1, 2, 0, 0, None))
            result[kind] = self.tonumber(L, -1, None)
            result[kind+'StateId'] = self.tonumber(L, -2, None)
        return result


if __name__ == '__main__':
    oracle = SingularityLayerOracle()
    values = [0, 1, 24, 48, 72, 96, 144, 192, 79, 80, 81, 133, 134, 159, 160, 161, 1999, 2000, 2001]
    out = {
        'scope': 'Original FuncTable expressions used by Cmd133367 and Cmd134388, with explicit final player mastery and original Lua math. No state dispatch, team stat assembly, timing or gameplay verification.',
        'sourceHash': oracle.assets['FuncTable.lua']['sha256'],
        'expressions': oracle.expressions,
        'fixtures': [{'finalRealmMastery': value, 'expected': oracle.evaluate(value)} for value in values],
    }
    (ROOT/'tests/synthetic/original-singularity-layers.json').write_text(json.dumps(out, indent=2)+'\n')
    print('Generated', len(values), 'original-runtime realm layer cases')
