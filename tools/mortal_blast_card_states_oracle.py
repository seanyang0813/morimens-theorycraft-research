"""Execute Mortal Blast's three BEAddState rows on synthetic Card targets.

The original add-state, manager, state, state-data and property-storage methods
remain connected. Only target construction, parser values and callbacks are
adapted, so the resulting Card registration route and stored properties are
observable without claiming a complete Mortal Blast command.
"""
import json

from connected_state_creation_oracle import ConnectedStateCreationOracle
from runtime_oracle import ROOT


CASES = (
    {'stateId': 2948, 'property': 'card_cost', 'expression': 'ChangedLayer*(-1)', 'catalogValue': 'ChangedLayer*(-1)', 'expectedValue': -1},
    {'stateId': 2454, 'property': 'consume', 'expression': '1', 'catalogValue': 1, 'expectedValue': 1},
    {'stateId': 2983, 'property': 'nothingness', 'expression': '1', 'catalogValue': 1, 'expectedValue': 1},
)


def main():
    catalog = json.loads((ROOT / 'research/extracted/config/State.json').read_text(encoding='utf-8'))
    fixtures = []
    hashes = None
    for case in CASES:
        row = catalog[str(case['stateId'])]
        if row.get('ExistProperty') != {case['property']: case['catalogValue']}:
            raise ValueError(f'Unexpected State row for {case["stateId"]}')
        oracle = ConnectedStateCreationOracle(
            connect_property=True,
            property_name=case['property'],
            property_expression=case['expression'],
        )
        actual = oracle.run(
            case['stateId'], 1, row['MaxLayer'],
            property_value=case['expectedValue'], target_kind='Card',
        )
        inputs = {**case, 'requestedLayer': 1, 'maximum': row['MaxLayer'], 'targetKind': 'Card'}
        fixtures.append({'input': inputs, 'expected': actual})
        current_hashes = {name: oracle.assets[name + '.lua']['sha256'] for name in (
            'BEAddState', 'BEAddStateParent', 'BattleStateMgrServer',
            'BattleStateServer', 'BattleStateData', 'BattlePropertyServer',
        )}
        if hashes is not None and hashes != current_hashes:
            raise ValueError('Oracle source hashes changed between cases')
        hashes = current_hashes
    output = ROOT / 'tests/synthetic/original-mortal-blast-card-states.json'
    payload = {
        'kind': 'SYNTHETIC_ORIGINAL_RUNTIME',
        'build': 'pc-res144-build51',
        'sourceHashes': hashes,
        'catalogStates': {str(case['stateId']): catalog[str(case['stateId'])] for case in CASES},
        'scope': (
            'Original BEAddState through manager/state construction and BattlePropertyServer storage '
            'for Mortal Blast states 2948, 2454 and 2983 on explicit Card targets. Parser values, '
            'target construction and callbacks are adapters. No LastTarget binding, card creation, '
            'card play, event body, gameplay or holdout validation.'
        ),
        'fixtures': fixtures,
    }
    output.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')
    print(f'Generated {len(fixtures)} connected Mortal Blast card-state cases')


if __name__ == '__main__':
    main()
