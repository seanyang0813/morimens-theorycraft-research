"""Run inherited BEAttachPostAction request fixtures with resource-150 dependencies."""
import hashlib
import json

from attach_post_action_oracle import AttachPostOracle, ROOT


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    module_dir = ROOT / 'research/observations/current-res150-build51/modules'
    comparison_path = ROOT / 'research/evidence/pc-res144-to-res150-combat-build.json'
    scheduler_path = ROOT / 'research/evidence/pc-res150-scheduler-modules.json'
    fixture_path = ROOT / 'tests/synthetic/original-attach-post-action.json'
    output = ROOT / 'research/evidence/pc-res150-attach-post-action-runtime.json'
    comparison = json.loads(comparison_path.read_text(encoding='utf-8'))
    scheduler = json.loads(scheduler_path.read_text(encoding='utf-8'))
    combat = {row['name']: row for row in comparison['combatModules']}
    schedule = {row['name']: row for row in scheduler['modules']}
    if schedule['BEAttachPostAction.lua']['status'] != 'IDENTICAL':
        raise ValueError('BEAttachPostAction equality required')
    assets = {}
    hashes = {'comparison': sha(comparison_path), 'schedulerModules': sha(scheduler_path), 'fixture': sha(fixture_path)}
    for name in ('BattleConst', 'BattleUtilServer', 'BattleCmdServer', 'BattlePropertyServer'):
        path = module_dir / f'{name}.lua'
        expected = combat[f'{name}.lua']['current'][0]
        if sha(path) != expected['sha256']:
            raise ValueError(f'Current module mismatch: {name}')
        assets[name] = {'output': str(path.relative_to(ROOT)).replace('\\', '/')}
        hashes[f'current{name}'] = sha(path)
    fixture = json.loads(fixture_path.read_text(encoding='utf-8'))
    oracle = AttachPostOracle(assets)
    mismatches = []
    for row in fixture['fixtures']:
        actual = oracle.run(row['input'])
        if actual != row['expected']:
            mismatches.append({'input': row['input'], 'baseline': row['expected'], 'current': actual})
    total = len(fixture['fixtures'])
    report = {
        'schemaVersion': 1,
        'kind': 'MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON',
        'baselineBuild': 'pc-res144-build51',
        'currentBuild': 'pc-res150-build51',
        'method': 'BEAttachPostAction.DoEffect and one non-monster iteration',
        'status': 'EXACT_MATCH_IN_FIXTURE_DOMAIN' if not mismatches else 'BEHAVIOR_CHANGE_DETECTED',
        'sourceHashes': hashes,
        'fixtures': total,
        'exactMatches': total - len(mismatches),
        'mismatches': len(mismatches),
        'results': mismatches,
        'scope': 'Byte-identical BEAttachPostAction executed with resource-150 dependencies over inherited parameter, trigger, seal-sign and empty-target fixtures.',
        'limitations': ['One non-monster iteration only', 'Role, record and card-use endpoints are observers', 'No attached-card execution, gameplay or holdout credit'],
    }
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps({'status': report['status'], 'fixtures': total, 'exactMatches': report['exactMatches'], 'output': str(output.relative_to(ROOT))}, indent=2))


if __name__ == '__main__':
    main()
