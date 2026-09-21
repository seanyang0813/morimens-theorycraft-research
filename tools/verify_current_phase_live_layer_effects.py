"""Run live-registry layer fixtures with the changed resource-150 add parent."""
import hashlib
import json
import os
from pathlib import Path

import UnityPy

from phase_live_layer_effect_oracle import PhaseLiveLayerOracle
from runtime_oracle import ROOT


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    fixture_path = ROOT / 'tests/synthetic/original-phase-live-layer-effects.json'
    fixture = json.loads(fixture_path.read_text(encoding='utf-8'))
    module_dir = ROOT / 'research/observations/current-res150-build51/modules'
    names = ('BEAddState', 'BEAddStateParent', 'BESubStateLayer', 'BattleStateMgrServer', 'BattleStateServer')
    current_hashes = {name: sha(module_dir / f'{name}.lua') for name in names}
    baseline_hashes = fixture['sourceHashes']
    changed = [name for name in names if current_hashes[name] != baseline_hashes[name]]
    if changed != ['BEAddStateParent']:
        raise ValueError(f'Unexpected changed phase-layer modules: {changed}')

    oracle = PhaseLiveLayerOracle({'output': str(module_dir / 'BEAddStateParent.lua')})
    mismatches = []
    for index, row in enumerate(fixture['fixtures']):
        values = row['input']
        actual = oracle.run(values['counterBefore'], values['phaseBefore'], values['amount'])
        if actual != row['expected']:
            mismatches.append({'index': index, 'input': values, 'expected': row['expected'], 'actual': actual})
    if mismatches:
        raise AssertionError(json.dumps(mismatches[:3], indent=2))

    program_files = Path(os.environ.get('ProgramFiles(x86)', r'C:\Program Files (x86)'))
    bundle_path = program_files / 'Steam/steamapps/common/Morimens/_game_data_/DownLoad/share.ab'
    UnityPy.set_assetbundle_decrypt_key((ROOT / 'research/raw/bundle-key.bin').read_bytes())
    installed_hashes = {}
    wanted = {f'{name}.lua': name for name in names}
    for obj in UnityPy.load(str(bundle_path)).objects:
        if obj.type.name != 'TextAsset':
            continue
        value = obj.read()
        if value.m_Name not in wanted:
            continue
        payload = value.m_Script.encode('utf-8', 'surrogateescape') if isinstance(value.m_Script, str) else bytes(value.m_Script)
        installed_hashes[wanted[value.m_Name]] = hashlib.sha256(payload).hexdigest()
    if installed_hashes != current_hashes:
        raise ValueError('Private phase-layer module copies do not match the installed share bundle')
    report = {
        'schemaVersion': 1,
        'kind': 'MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON',
        'baselineBuild': 'pc-res144-build51',
        'currentBuild': 'pc-res150-build51',
        'method': 'execute changed add-state parent with byte-identical effect, manager and state modules',
        'status': 'CURRENT_CHANGED_PARENT_RUNTIME_MATCH',
        'sourceHashes': {
            'fixture': sha(fixture_path),
            'installedShareBundle': sha(bundle_path),
            'baselineModules': baseline_hashes,
            'currentModules': current_hashes,
        },
        'changedModules': changed,
        'fixtures': len(fixture['fixtures']),
        'matched': len(fixture['fixtures']),
        'mismatches': 0,
        'scope': (
            'The installed resource-150 BEAddStateParent executes all inherited connected existing-state '
            'counter-add and phase-subtraction fixtures exactly. The four other participating installed '
            'modules are byte-identical to the baseline modules.'
        ),
        'limitations': [
            'Synthetic target and pre-existing states',
            'First-time state construction and property implementation are not executed',
            'Observed callbacks do not execute their event bodies',
            'No gameplay or holdout credit',
        ],
    }
    output = ROOT / 'research/evidence/pc-res150-phase-live-layer-effects-runtime.json'
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps({'status': report['status'], 'fixtures': report['fixtures'], 'output': str(output.relative_to(ROOT))}, indent=2))


if __name__ == '__main__':
    main()
