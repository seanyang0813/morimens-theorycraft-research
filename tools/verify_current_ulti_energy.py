"""Run inherited ultimate-energy fixtures against installed resource-150 modules."""
import hashlib
import json

from target_runtime_oracle import ROOT
from ulti_energy_oracle import UltiOracle
from ulti_energy_effect_oracle import EffectOracle
from ulti_energy_gain_oracle import GainOracle


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    module_dir = ROOT / 'research/observations/current-res150-build51/modules'
    output = ROOT / 'research/evidence/pc-res150-ulti-energy-runtime.json'
    module_names = ('BattleConst', 'BattleUtilServer', 'BattleCmdServer',
                    'BattlePropertyServer', 'BattleEffectServer',
                    'BEGainUltiEnergy', 'BattleUnitAwaker')
    assets = {name: {'output': str(module_dir / f'{name}.lua')} for name in module_names}
    for name, row in assets.items():
        if not (module_dir / f'{name}.lua').is_file():
            raise FileNotFoundError(f'Missing current module: {name}')

    specs = [
        ('calculation', ROOT/'tests/synthetic/original-ulti-energy.json', UltiOracle(assets), lambda oracle, value: oracle.run(value)),
        ('effect', ROOT/'tests/synthetic/original-ulti-energy-effect.json', EffectOracle(assets), lambda oracle, value: oracle.run(value)),
        ('gainStorage', ROOT/'tests/synthetic/original-ulti-energy-gain.json', GainOracle(assets), lambda oracle, value: oracle.run(value)),
    ]
    results, mismatches, hashes, total = {}, [], {}, 0
    for domain, path, oracle, runner in specs:
        data = json.loads(path.read_text(encoding='utf-8'))
        hashes[domain+'Fixture'] = sha(path)
        bad = []
        for row in data['fixtures']:
            actual = runner(oracle, row['input'])
            if actual != row['expected']:
                bad.append({'input': row['input'], 'baseline': row['expected'], 'current': actual})
        total += len(data['fixtures'])
        results[domain] = {'fixtures': len(data['fixtures']), 'exactMatches': len(data['fixtures'])-len(bad), 'mismatches': len(bad)}
        mismatches.extend({'domain': domain, **row} for row in bad)
    hashes.update({f'current{name}': sha(module_dir/f'{name}.lua') for name in module_names})
    report = {
        'schemaVersion': 1,
        'kind': 'MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON',
        'baselineBuild': 'pc-res144-build51',
        'currentBuild': 'pc-res150-build51',
        'methods': ['BattleCmdServer.GetRealUltiEnergy', 'BEGainUltiEnergy.DoEffect', 'BattleUnitAwaker.GainUltiEnergy'],
        'status': 'EXACT_MATCH_IN_FIXTURE_DOMAIN' if not mismatches else 'BEHAVIOR_CHANGE_DETECTED',
        'sourceHashes': hashes,
        'domains': results,
        'fixtures': total,
        'exactMatches': total-len(mismatches),
        'mismatches': len(mismatches),
        'results': mismatches,
        'scope': 'Installed resource-150 command, utility, property, effect and Awakener bytecode across inherited ordinary ultimate-energy calculation, repetition/source assembly and capped storage fixtures.',
        'limitations': ['Synthetic explicit properties, targets, tags and card/caster eligibility; no automatic build or target assembly', 'Callbacks are observed but not dispatched; no full command, card lifecycle, gameplay or holdout credit'],
    }
    output.write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8', newline='\n')
    print(json.dumps({'status': report['status'], 'fixtures': total, 'exactMatches': report['exactMatches'], 'domains': results, 'output': str(output.relative_to(ROOT))}, indent=2))


if __name__ == '__main__':
    main()
