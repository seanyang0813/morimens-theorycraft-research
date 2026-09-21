"""Generate second-phase state creation through original limit-property storage."""
import json
import math

from connected_state_creation_oracle import ConnectedStateCreationOracle
from runtime_oracle import ROOT


EXPRESSION = 'math.ceil(StateOwner.max_hp*0.33)'


if __name__ == '__main__':
    oracle = ConnectedStateCreationOracle(
        connect_property=True,
        property_name='be_damage_limit',
        property_expression=EXPRESSION,
    )
    fixtures = []
    for max_hp in (1, 2, 3, 100, 1000, 1001, 123456):
        limit = math.ceil(max_hp * 0.33)
        requested = limit + 1
        inputs = {'stateId': 60408, 'maxHp': max_hp, 'requestedLayer': requested, 'resolvedLimit': limit, 'maximum': 999999999}
        fixtures.append({'input': inputs, 'expected': oracle.run(60408, requested, 999999999, property_value=limit)})
    names = ('BEAddState', 'BEAddStateParent', 'BattleStateMgrServer', 'BattleStateServer', 'BattleStateData', 'BattlePropertyServer')
    output = {
        'kind': 'SYNTHETIC_ORIGINAL_RUNTIME',
        'build': 'pc-res144-build51',
        'sourceHashes': {name: oracle.assets[name + '.lua']['sha256'] for name in names},
        'catalogState': {'ID': 60408, 'MaxLayer': 999999999, 'ExistProperty': {'be_damage_limit': EXPRESSION}},
        'scope': (
            'Original add-state, manager, constructor, AfterInit and property-storage path for absent second-phase '
            'state 60408. Layer is the separately runtime-verified transition expression ceil(maxHp*0.33)+1; '
            'be_damage_limit is the separately runtime-verified state expression ceil(maxHp*0.33). Those resolved '
            'numbers are explicit parser inputs here. Synthetic non-player target and callback observers; no joined '
            'command-row execution, event body, gameplay or holdout.'
        ),
        'fixtures': fixtures,
    }
    path = ROOT / 'tests/synthetic/original-connected-phase-property-creation.json'
    path.write_text(json.dumps(output, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(f'Generated {len(fixtures)} connected phase/property creation cases at {path.relative_to(ROOT)}')
