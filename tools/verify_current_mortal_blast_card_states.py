"""Re-execute Mortal Blast Card-state fixtures with resource-150 changes."""
import hashlib
import json
from pathlib import Path

from connected_state_creation_oracle import ConnectedStateCreationOracle
from runtime_oracle import ROOT


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    fixture_path = ROOT / 'tests/synthetic/original-mortal-blast-card-states.json'
    fixture = json.loads(fixture_path.read_text(encoding='utf-8'))
    module_dir = ROOT / 'research/observations/current-res150-build51/modules'
    current_state_path = module_dir / 'State.json'
    current_state = json.loads(current_state_path.read_text(encoding='utf-8'))
    baseline_state = json.loads((ROOT / 'research/extracted/config/State.json').read_text(encoding='utf-8'))
    state_fields = {}
    for row in fixture['fixtures']:
        state_id = str(row['input']['stateId'])
        fields = ('ID', 'MaxLayer', 'ExistProperty')
        baseline = {field: baseline_state[state_id].get(field) for field in fields}
        current = {field: current_state[state_id].get(field) for field in fields}
        if baseline != current:
            raise ValueError(f'Mortal Blast State mechanics changed for {state_id}')
        state_fields[state_id] = current

    state_report = json.loads((ROOT / 'research/evidence/pc-res150-connected-state-creation-runtime.json').read_text(encoding='utf-8'))
    property_report_path = ROOT / 'research/evidence/pc-res150-combat-property-mutation-runtime.json'
    property_report = json.loads(property_report_path.read_text(encoding='utf-8'))
    if state_report.get('status') != 'CURRENT_CHANGED_PARENT_RUNTIME_MATCH':
        raise ValueError('Current state-manager source validation is missing')
    if property_report.get('status') != 'EXACT_MATCH_IN_FIXTURE_DOMAIN':
        raise ValueError('Current property source validation is missing')

    mismatches = []
    for index, row in enumerate(fixture['fixtures']):
        values = row['input']
        oracle = ConnectedStateCreationOracle(
            {'output': str(module_dir / 'BEAddStateParent.lua')},
            connect_property=True,
            property_asset={'output': str(module_dir / 'BattlePropertyServer.lua')},
            property_name=values['property'],
            property_expression=values['expression'],
        )
        actual = oracle.run(
            values['stateId'], values['requestedLayer'], values['maximum'],
            property_value=values['expectedValue'], target_kind='Card',
        )
        if actual != row['expected']:
            mismatches.append({'index': index, 'stateId': values['stateId'], 'expected': row['expected'], 'actual': actual})
    if mismatches:
        raise AssertionError(json.dumps(mismatches, indent=2))

    output = ROOT / 'research/evidence/pc-res150-mortal-blast-card-states.json'
    report = {
        'schemaVersion': 1,
        'kind': 'MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON',
        'baselineBuild': 'pc-res144-build51',
        'currentBuild': 'pc-res150-build51',
        'status': 'EXACT_MATCH_IN_FIXTURE_DOMAIN',
        'fixtures': len(fixture['fixtures']),
        'matched': len(fixture['fixtures']),
        'mismatches': 0,
        'mechanicsFields': state_fields,
        'sourceHashes': {
            'baselineFixture': sha(fixture_path),
            'currentStateCatalog': sha(current_state_path),
            'currentBEAddStateParent': sha(module_dir / 'BEAddStateParent.lua'),
            'currentBattlePropertyServer': sha(module_dir / 'BattlePropertyServer.lua'),
            'stateCreationValidation': sha(ROOT / 'research/evidence/pc-res150-connected-state-creation-runtime.json'),
            'propertyValidation': sha(property_report_path),
        },
        'scope': 'Resource-150 add-state parent and property storage reproduce three inherited Card-target fixtures; ID, MaxLayer and ExistProperty fields also match.',
        'limitations': ['Synthetic Card target and parser adapters', 'No LastTarget binding, full command scheduling, card play, gameplay or holdout credit'],
    }
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps({'status': report['status'], 'fixtures': report['fixtures'], 'output': str(output.relative_to(ROOT))}, indent=2))


if __name__ == '__main__':
    main()
