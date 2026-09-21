"""Compare selected resource-150 monster death behavior with resource 144 fixtures."""
from pathlib import Path
import hashlib
import json

from death_path_oracle import CASES, DeathPathOracle, ROOT


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    module_dir = ROOT / 'research/observations/current-res150-build51/modules'
    fixture_path = ROOT / 'tests/synthetic/original-role-die.json'
    scheduler_path = ROOT / 'research/evidence/pc-res150-scheduler-modules.json'
    card_path = ROOT / 'research/evidence/pc-res150-card-modules.json'
    combat_path = ROOT / 'research/evidence/pc-res144-to-res150-combat-build.json'
    output = ROOT / 'research/evidence/pc-res150-death-path-runtime.json'
    fixture = json.loads(fixture_path.read_text(encoding='utf-8'))
    scheduler = {row['name']: row for row in json.loads(scheduler_path.read_text(encoding='utf-8'))['modules']}
    card = {row['name']: row for row in json.loads(card_path.read_text(encoding='utf-8'))['modules']}
    combat = {row['name']: row for row in json.loads(combat_path.read_text(encoding='utf-8'))['combatModules']}
    assets = {}
    hashes = {'fixture': sha(fixture_path), 'schedulerComparison': sha(scheduler_path), 'cardComparison': sha(card_path), 'combatComparison': sha(combat_path)}
    for name in ('BERoleDie', 'BattleUnitMonster'):
        path = module_dir / f'{name}.lua'
        expected = scheduler[f'{name}.lua']['current']
        if sha(path) != expected['sha256']:
            raise ValueError(f'Current module mismatch: {name}')
        assets[name] = {'output': str(path.relative_to(ROOT)).replace('\\', '/')}
        hashes[f'current{name}'] = sha(path)
    player_path = module_dir / 'BattleUnitPlayer.lua'
    if sha(player_path) != card['BattleUnitPlayer.lua']['current']['sha256']:
        raise ValueError('Current BattleUnitPlayer mismatch')
    assets['BattleUnitPlayer'] = {'output': str(player_path.relative_to(ROOT)).replace('\\', '/')}
    hashes['currentBattleUnitPlayer'] = sha(player_path)
    const_path = module_dir / 'BattleConst.lua'
    if sha(const_path) != combat['BattleConst.lua']['current'][0]['sha256']:
        raise ValueError('Current BattleConst mismatch')
    assets['BattleConst'] = {'output': str(const_path.relative_to(ROOT)).replace('\\', '/')}
    hashes['currentBattleConst'] = sha(const_path)
    oracle = DeathPathOracle(assets)
    mismatches = []
    for row in fixture['fixtures']:
        actual = oracle.run_die(row['input'])
        if actual != row['expected']:
            mismatches.append({'input': row['input'], 'baseline': row['expected'], 'current': actual})
    current_precheck = oracle.monster_precheck()
    if current_precheck != fixture['monsterPreCheckDeathEvent']:
        mismatches.append({'input': {'method': 'BattleUnitMonster.PreCheckDeathEvent'}, 'baseline': fixture['monsterPreCheckDeathEvent'], 'current': current_precheck})
    total = len(CASES) + 1
    report = {
        'schemaVersion': 1,
        'kind': 'MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON',
        'baselineBuild': 'pc-res144-build51',
        'currentBuild': 'pc-res150-build51',
        'method': 'selected monster death path',
        'status': 'EXACT_MATCH_IN_FIXTURE_DOMAIN' if not mismatches else 'BEHAVIOR_CHANGE_DETECTED',
        'sourceHashes': hashes,
        'fixtures': total,
        'exactMatches': total - len(mismatches),
        'mismatches': len(mismatches),
        'results': mismatches,
        'scope': 'Actual resource-150 BERoleDie.DoEffect over missing/revived/monster/PvE-player/PvP branches plus BattleUnitMonster.PreCheckDeathEvent, using resource-150 BattleConst. Explicit HP, camp, lives, intro, respawn-cost and mode adapters; record/yield/respawn/death/battle-end calls observed.',
        'limitations': ['No OnConfirm, RoleDie internals, scheduler traversal, event listeners, gameplay or holdout credit'],
    }
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps({'status': report['status'], 'fixtures': total, 'exactMatches': report['exactMatches'], 'output': str(output.relative_to(ROOT))}, indent=2))


if __name__ == '__main__':
    main()
