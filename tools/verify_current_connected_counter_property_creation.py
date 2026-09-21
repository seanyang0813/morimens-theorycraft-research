"""Run counter/property construction with changed resource-150 modules."""
import hashlib
import json
import os
from pathlib import Path

import UnityPy

from connected_state_creation_oracle import ConnectedStateCreationOracle
from runtime_oracle import ROOT


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    fixture_path = ROOT / 'tests/synthetic/original-connected-counter-property-creation.json'
    fixture = json.loads(fixture_path.read_text(encoding='utf-8'))
    names = ('BEAddState', 'BEAddStateParent', 'BattleStateMgrServer', 'BattleStateServer', 'BattleStateData', 'BattlePropertyServer')
    module_dir = ROOT / 'research/observations/current-res150-build51/modules'
    current_hashes = {name: sha(module_dir / f'{name}.lua') for name in names}
    changed = [name for name in names if current_hashes[name] != fixture['sourceHashes'][name]]
    if changed != ['BEAddStateParent', 'BattlePropertyServer']:
        raise ValueError(f'Unexpected changed counter/property modules: {changed}')

    program_files = Path(os.environ.get('ProgramFiles(x86)', r'C:\Program Files (x86)'))
    bundle_path = program_files / 'Steam/steamapps/common/Morimens/_game_data_/DownLoad/share.ab'
    UnityPy.set_assetbundle_decrypt_key((ROOT / 'research/raw/bundle-key.bin').read_bytes())
    wanted = {f'{name}.lua': name for name in names}
    installed_hashes = {}
    for obj in UnityPy.load(str(bundle_path)).objects:
        if obj.type.name != 'TextAsset':
            continue
        value = obj.read()
        if value.m_Name not in wanted:
            continue
        payload = value.m_Script.encode('utf-8', 'surrogateescape') if isinstance(value.m_Script, str) else bytes(value.m_Script)
        installed_hashes[wanted[value.m_Name]] = hashlib.sha256(payload).hexdigest()
    if installed_hashes != current_hashes:
        raise ValueError('Private counter/property module copies do not match installed share bundle')

    oracle = ConnectedStateCreationOracle(
        {'output': str(module_dir / 'BEAddStateParent.lua')},
        connect_property=True,
        property_asset={'output': str(module_dir / 'BattlePropertyServer.lua')},
    )
    mismatches = []
    for index, row in enumerate(fixture['fixtures']):
        values = row['input']
        actual = oracle.run(values['stateId'], values['requestedLayer'], values['maximum'])
        if actual != row['expected']:
            mismatches.append({'index': index, 'input': values, 'expected': row['expected'], 'actual': actual})
    if mismatches:
        raise AssertionError(json.dumps(mismatches[:3], indent=2))

    report = {
        'schemaVersion': 1,
        'kind': 'MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON',
        'baselineBuild': 'pc-res144-build51',
        'currentBuild': 'pc-res150-build51',
        'method': 'execute changed add-state parent and property server with byte-identical manager/state/data modules',
        'status': 'CURRENT_CHANGED_MODULES_RUNTIME_MATCH',
        'sourceHashes': {
            'fixture': sha(fixture_path),
            'installedShareBundle': sha(bundle_path),
            'baselineModules': fixture['sourceHashes'],
            'currentModules': current_hashes,
        },
        'changedModules': changed,
        'fixtures': len(fixture['fixtures']),
        'matched': len(fixture['fixtures']),
        'mismatches': 0,
        'scope': (
            'Installed resource-150 BEAddStateParent and BattlePropertyServer reproduce every inherited '
            'first-time state-60407 construction and be_damage_statics storage fixture.'
        ),
        'limitations': [
            'ChangedLayer and maximum expressions use explicit parser adapters',
            'Synthetic non-player target and callback observers',
            'No command condition, event body, gameplay or holdout credit',
        ],
    }
    output = ROOT / 'research/evidence/pc-res150-connected-counter-property-creation-runtime.json'
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps({'status': report['status'], 'fixtures': report['fixtures'], 'output': str(output.relative_to(ROOT))}, indent=2))


if __name__ == '__main__':
    main()
