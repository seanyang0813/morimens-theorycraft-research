"""Run joined phase expressions/effects with installed changed modules."""
import hashlib
import json
import os
from pathlib import Path

import UnityPy

from joined_phase_command_effect_oracle import JoinedPhaseCommandEffectOracle
from runtime_oracle import ROOT


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    fixture_path = ROOT / 'tests/synthetic/original-joined-phase-command-effects.json'
    fixture = json.loads(fixture_path.read_text(encoding='utf-8'))
    names = ('FuncTable', 'Cmd', 'BattleCmdServer', 'BattleCmdParser', 'BattleEffectServer', 'BattleEffectMgrServer', 'BEAddState', 'BEAddStateParent', 'BESubStateLayer', 'BERemoveState', 'BEMonsterChangeSkill', 'BattleStateMgrServer', 'BattleStateServer')
    identical_names = ('BattleEffectServer', 'BattleEffectMgrServer')
    module_dir = ROOT / 'research/observations/current-res150-build51/modules'
    current_hashes = {name: sha(module_dir / f'{name}.lua') for name in names if name not in identical_names}
    phase_modules_path = ROOT / 'research/evidence/pc-res150-skill-phase-modules.json'
    phase_modules = {row['name'][:-4]: row for row in json.loads(phase_modules_path.read_text(encoding='utf-8'))['modules']}
    for name in identical_names:
        row = phase_modules[name]
        if row['status'] != 'IDENTICAL' or row['baseline']['sha256'] != fixture['sourceHashes'][name]:
            raise ValueError(f'Unexpected current construction module: {name}')
        current_hashes[name] = row['current']['sha256']
    changed = [name for name in names if current_hashes[name] != fixture['sourceHashes'][name]]
    if changed != ['FuncTable', 'Cmd', 'BattleCmdServer', 'BattleCmdParser', 'BEAddStateParent']:
        raise ValueError(f'Unexpected changed joined-phase modules: {changed}')

    program_files = Path(os.environ.get('ProgramFiles(x86)', r'C:\Program Files (x86)'))
    download = program_files / 'Steam/steamapps/common/Morimens/_game_data_/DownLoad'
    UnityPy.set_assetbundle_decrypt_key((ROOT / 'research/raw/bundle-key.bin').read_bytes())
    wanted = {f'{name}.lua': name for name in names}
    installed_hashes = {}
    for bundle_name in ('share.ab', 'config.ab'):
        for obj in UnityPy.load(str(download / bundle_name)).objects:
            if obj.type.name != 'TextAsset':
                continue
            value = obj.read()
            if value.m_Name not in wanted:
                continue
            payload = value.m_Script.encode('utf-8', 'surrogateescape') if isinstance(value.m_Script, str) else bytes(value.m_Script)
            installed_hashes[wanted[value.m_Name]] = hashlib.sha256(payload).hexdigest()
    if installed_hashes != current_hashes:
        raise ValueError('Private joined-phase module copies do not match installed bundles')
    catalog_report = json.loads((ROOT / 'research/evidence/pc-res150-connected-hp-phase-cap-command-runtime.json').read_text(encoding='utf-8'))
    if catalog_report.get('resultsCatalogRows') != {'60406': 8, '60405': 7}:
        raise ValueError('Current phase command rows are not catalog-bound')

    oracle = JoinedPhaseCommandEffectOracle(
        {'output': str(module_dir / 'BEAddStateParent.lua')},
        {'output': str(module_dir / 'FuncTable.lua')},
        {'output': str(module_dir / 'BattleCmdParser.lua')},
        {'output': str(module_dir / 'BattleCmdServer.lua')},
    )
    mismatches = []
    for index, row in enumerate(fixture['fixtures']):
        actual = oracle.run_joined(row['input'])
        if actual != row['expected']:
            mismatches.append({'index': index, 'input': row['input'], 'expected': row['expected'], 'actual': actual})
    if mismatches:
        raise AssertionError(json.dumps(mismatches[:3], indent=2))

    report = {
        'schemaVersion': 1,
        'kind': 'MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON',
        'baselineBuild': 'pc-res144-build51',
        'currentBuild': 'pc-res150-build51',
        'method': 'execute current BattleCmdServer CheckCondition, BattleCmdParser, FuncTable and changed add parent against byte-identical effect/manager/state modules and catalog-equal rows',
        'status': 'CURRENT_CHANGED_MODULES_RUNTIME_MATCH',
        'sourceHashes': {
            'fixture': sha(fixture_path),
            'installedShareBundle': sha(download / 'share.ab'),
            'installedConfigBundle': sha(download / 'config.ab'),
            'currentCatalogReport': sha(ROOT / 'research/evidence/pc-res150-connected-hp-phase-cap-command-runtime.json'),
            'phaseModuleComparison': sha(phase_modules_path),
            'baselineModules': fixture['sourceHashes'],
            'currentModules': current_hashes,
        },
        'changedModules': changed,
        'fixtures': len(fixture['fixtures']),
        'matched': len(fixture['fixtures']),
        'mismatches': 0,
        'scope': 'Installed current CheckCondition, parser, expressions and add parent reproduce every inherited joined command-row/effect-body transition fixture.',
        'limitations': [
            'Original GenerateEffectList and GenerateEffectObj construct typed effects through original BattleEffectMgrServer; original CheckCondition/parser resolve values before Python hands them to real effect bodies',
            'Destination states are pre-created live zero-layer adapters',
            'Typed effect classes use callable constructor wrappers; target-expression max HP/state-layer reads are a narrow adapter; no original effect scheduler, property bodies, gameplay or holdout credit',
        ],
    }
    output = ROOT / 'research/evidence/pc-res150-joined-phase-command-effects-runtime.json'
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps({'status': report['status'], 'fixtures': report['fixtures'], 'output': str(output.relative_to(ROOT))}, indent=2))


if __name__ == '__main__':
    main()
