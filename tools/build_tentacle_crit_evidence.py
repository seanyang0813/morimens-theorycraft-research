"""Publish installed Tentacle critical-bonus source and fixture scope."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    original_assets = json.loads((ROOT / 'research/symbols/text-assets.json').read_text(encoding='utf-8'))
    original = ROOT / next(row['output'] for row in original_assets if row['name'] == 'BattleZoneUtil.lua')
    installed = ROOT / 'research/observations/current-res151-build51/modules/BattleZoneUtil.lua'
    fixture_path = ROOT / 'tests/synthetic/installed-tentacle-crit-damage.json'
    fixture = json.loads(fixture_path.read_text(encoding='utf-8'))
    if sha(original) != sha(installed) or fixture['build'] != 'pc-res151-build51' or fixture['sourceHash'] != sha(installed) or len(fixture['fixtures']) != 308:
        raise ValueError('Installed Tentacle critical-bonus source or fixture changed')
    report = {'schemaVersion': 1, 'kind': 'MORIMENS_PC_INSTALLED_TENTACLE_CRIT_DAMAGE_RUNTIME',
              'build': 'pc-res151-build51', 'status': 'EXACT_IN_SYNTHETIC_FIXTURE_DOMAIN',
              'sourceHashes': {'installedBattleZoneUtil': sha(installed), 'originalRuntimeFixture': sha(fixture_path)},
              'moduleByteIdenticalToResource144': True, 'originalRuntimeCases': 308,
              'method': 'Execute installed BattleZoneUtil.GetTentacleCritDmg in copied XLua with explicit region, Player outside Crit DMG and Awaker Crit DMG properties; compare both regional branches with independent JavaScript arithmetic.',
              'scope': 'International branch ceilings outside Crit DMG plus average Awaker Crit DMG minus 50; Japan branch returns outside Crit DMG directly.',
              'limitations': ['The region flag is supplied, not reconstructed from a recorded battle.',
                              'This computes a critical bonus conditional on a critical hit; critical chance, random draw, source property assembly and gameplay remain separate.',
                              'No independent gameplay or holdout credit.']}
    output = ROOT / 'research/evidence/pc-res151-tentacle-crit-runtime.json'
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print('Wrote installed Tentacle Crit DMG evidence, 308 cases')


if __name__ == '__main__':
    main()
