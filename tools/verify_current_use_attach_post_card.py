"""Run inherited UseAttachPostCard fixtures with resource-150 dependencies."""
import hashlib
import json

from use_attach_post_card_oracle import UseAttachPostCardOracle, ROOT


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    module_dir = ROOT / 'research/observations/current-res150-build51/modules'
    comparison_path = ROOT / 'research/evidence/pc-res144-to-res150-combat-build.json'
    card_path = ROOT / 'research/evidence/pc-res150-card-modules.json'
    fixture_path = ROOT / 'tests/synthetic/original-use-attach-post-card.json'
    output = ROOT / 'research/evidence/pc-res150-use-attach-post-card-runtime.json'
    comparison = json.loads(comparison_path.read_text(encoding='utf-8'))
    cards = json.loads(card_path.read_text(encoding='utf-8'))
    combat = {row['name']: row for row in comparison['combatModules']}
    card_rows = {row['name']: row for row in cards['modules']}
    assets = {}
    hashes = {'comparison': sha(comparison_path), 'cardModules': sha(card_path), 'fixture': sha(fixture_path)}
    for name in ('BattleConst', 'BattleUtilServer', 'BattleCmdServer', 'BattlePropertyServer'):
        path = module_dir / f'{name}.lua'
        expected = combat[f'{name}.lua']['current'][0]
        if sha(path) != expected['sha256']:
            raise ValueError(f'Current module mismatch: {name}')
        assets[name] = {'output': str(path.relative_to(ROOT)).replace('\\', '/')}
        hashes[f'current{name}'] = sha(path)
    if card_rows['BattleUnitBase.lua']['status'] != 'IDENTICAL':
        raise ValueError('BattleUnitBase equality required')
    fixture = json.loads(fixture_path.read_text(encoding='utf-8'))
    # The method-bearing module is byte-identical. Replacing its changed shared
    # dependencies tests the same boundary in the installed build context.
    oracle = UseAttachPostCardOracle(assets)
    mismatches = []
    for row in fixture['fixtures']:
        actual = oracle.run_use_attach(row['input'])
        if actual != row['expected']:
            mismatches.append({'input': row['input'], 'baseline': row['expected'], 'current': actual})
    total = len(fixture['fixtures'])
    report = {
        'schemaVersion': 1,
        'kind': 'MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON',
        'baselineBuild': 'pc-res144-build51',
        'currentBuild': 'pc-res150-build51',
        'method': 'BattleUnitBase.UseAttachPostCard request construction',
        'status': 'EXACT_MATCH_IN_FIXTURE_DOMAIN' if not mismatches else 'BEHAVIOR_CHANGE_DETECTED',
        'sourceHashes': hashes,
        'fixtures': total,
        'exactMatches': total - len(mismatches),
        'mismatches': len(mismatches),
        'results': mismatches,
        'scope': 'Byte-identical BattleUnitBase.UseAttachPostCard executed with resource-150 dependencies over inherited main-only, pre-command and trigger-parameter fixtures.',
        'limitations': ['Card constructor and manager endpoints are observers', 'No effect execution, callbacks, gameplay or holdout credit'],
    }
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps({'status': report['status'], 'fixtures': total, 'exactMatches': report['exactMatches'], 'output': str(output.relative_to(ROOT))}, indent=2))


if __name__ == '__main__':
    main()
