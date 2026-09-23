"""Publish hash-only installed-client scope for the Tentacle pre-hit oracle."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    modules = {}
    for name in ('SchoolCompPVE.lua', 'BETentacleAttack.lua'):
        original = ROOT / next(row['output'] for row in json.loads(
            (ROOT / 'research/symbols/text-assets.json').read_text(encoding='utf-8'))
            if row['name'] == name)
        installed = ROOT / 'research/observations/current-res151-build51/modules' / name
        if not installed.is_file() or sha(original) != sha(installed):
            raise ValueError(f'Original and installed {name} differ or are missing')
        modules[name] = {'sha256': sha(installed), 'status': 'BYTE_IDENTICAL'}
    fixture_path = ROOT / 'tests/synthetic/installed-tentacle-prehit.json'
    fixture = json.loads(fixture_path.read_text(encoding='utf-8'))
    if fixture['build'] != 'pc-res151-build51' or fixture['sourceHash'] != modules['SchoolCompPVE.lua']['sha256'] or len(fixture['fixtures']) != 414:
        raise ValueError('Tentacle oracle fixture changed')
    report = {'schemaVersion': 1, 'kind': 'MORIMENS_PC_INSTALLED_TENTACLE_PREHIT_RUNTIME',
              'build': 'pc-res151-build51', 'status': 'EXACT_IN_SYNTHETIC_FIXTURE_DOMAIN',
              'sourceHashes': modules,
              'originalRuntimeFixtureSha256': sha(fixture_path),
              'originalRuntimeCases': len(fixture['fixtures']),
              'method': 'Execute installed SchoolCompPVE.CalcTentacleDmg in copied XLua with one synthetic Awakener, explicit target/property getters and deterministic random draw; compare the independent JavaScript formula to every output.',
              'scope': 'Resolved Tentacle pre-hit calculation, including critical multiplier, four multiplicative target damage properties, Vulnerable, six Awakener-derived categories/state factor, two flat additions, ceiling and minimum one.',
              'limitations': ['Synthetic adapters and deterministic critical branch, not observed gameplay.',
                              'The BETentacleAttack effect parameter ceiling, target selection, repeats and skill-argument addition are not composed in this comparison.',
                              'Awakener bonuses are supplied as resolved aggregate values; multiple-Awakener averaging and per-state grouping are not exercised.',
                              'BeHit, HP loss, callbacks, target death, replay source binding and independent holdout are outside scope.']}
    output = ROOT / 'research/evidence/pc-res151-tentacle-prehit-runtime.json'
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print('Wrote installed Tentacle runtime evidence,', len(fixture['fixtures']), 'cases')


if __name__ == '__main__':
    main()
