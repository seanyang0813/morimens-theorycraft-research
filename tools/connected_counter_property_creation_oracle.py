"""Generate first-time phase-counter creation through actual property storage."""
import json

from connected_state_creation_oracle import ConnectedStateCreationOracle
from runtime_oracle import ROOT


if __name__ == '__main__':
    oracle = ConnectedStateCreationOracle(connect_property=True)
    maximum = 999999999
    fixtures = []
    for requested in (1, 2, 125, 330, maximum):
        inputs = {'stateId': oracle.COUNTER_STATE, 'requestedLayer': requested, 'maximum': maximum}
        fixtures.append({'input': inputs, 'expected': oracle.run(oracle.COUNTER_STATE, requested, maximum)})
    names = ('BEAddState', 'BEAddStateParent', 'BattleStateMgrServer', 'BattleStateServer', 'BattleStateData', 'BattlePropertyServer')
    output = {
        'kind': 'SYNTHETIC_ORIGINAL_RUNTIME',
        'build': 'pc-res144-build51',
        'sourceHashes': {name: oracle.assets[name + '.lua']['sha256'] for name in names},
        'catalogState': {'ID': 60407, 'MaxLayer': maximum, 'ExistProperty': {'be_damage_statics': 'ChangedLayer'}},
        'scope': (
            'Original BEAddState through original manager and state constructor for absent state 60407, '
            'then original BattleStateServer.InitProperty/ChangeOwnerProperty into original '
            'BattlePropertyServer.ChangeProperty storage and callbacks. Actual extracted state ID, maximum '
            'and ExistProperty expression; ChangedLayer and maximum expression values are explicit parser '
            'adapters. Synthetic non-player target, trigger/log/serialize observers, no event body, command '
            'condition, gameplay or holdout.'
        ),
        'fixtures': fixtures,
    }
    path = ROOT / 'tests/synthetic/original-connected-counter-property-creation.json'
    path.write_text(json.dumps(output, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(f'Generated {len(fixtures)} connected counter/property creation cases at {path.relative_to(ROOT)}')
