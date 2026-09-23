"""Publish source-hashed installed Player Tentacle calculation scope."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    fixture_path = ROOT / 'tests/synthetic/installed-player-tentacle-damage.json'
    fixture = json.loads(fixture_path.read_text(encoding='utf-8'))
    module = ROOT / 'research/observations/current-res151-build51/modules/BattleUnitPlayer.lua'
    constant_path = ROOT / 'research/observations/current-res151-build51/modules/Constant.json'
    parity_path = ROOT / 'research/evidence/pc-res151-tentacle-source-parity.json'
    parity = json.loads(parity_path.read_text(encoding='utf-8'))
    constant = json.loads(constant_path.read_text(encoding='utf-8'))['TentacleDamageForPowerPercent']['Data'][0]
    if fixture['build'] != 'pc-res151-build51' or len(fixture['fixtures']) != 377 or fixture['sourceHash'] != sha(module) or fixture['constantSourceHash'] != sha(constant_path) or constant != -100:
        raise ValueError('Installed Player Tentacle fixture or source changed')
    if parity.get('status') != 'SELECTED_METHOD_BODIES_IDENTICAL' or {row['method'] for row in parity['methods']} != {'GetTentacleDamage', 'PlayerRole.tentacle_dmg alias'}:
        raise ValueError('Selected source-method parity is incomplete')
    report = {'schemaVersion': 1, 'kind': 'MORIMENS_PC_INSTALLED_PLAYER_TENTACLE_RUNTIME',
              'build': 'pc-res151-build51', 'status': 'EXACT_IN_SYNTHETIC_FIXTURE_DOMAIN',
              'sourceHashes': {'BattleUnitPlayer': sha(module), 'Constant': sha(constant_path),
                               'methodParityReport': sha(parity_path), 'originalRuntimeFixture': sha(fixture_path)},
              'originalRuntimeCases': len(fixture['fixtures']), 'powerContributionPercent': constant,
              'method': 'Execute installed BattleUnitPlayer.GetTentacleDamage in copied XLua with explicit Player/Awakener property getters, PvE branch, Power-layer and Dimension adapters; compare independent JavaScript calculation to every output.',
              'scope': 'Computed Player Tentacle damage from stored base/flat, average Awaker basic and nine inside percentage slots, Weak, Dimension, Tentacle bonus, ceiling and minimum one. Parser alias and producer method bodies are separately compared with resource 144.',
              'limitations': ['No automatic equipment/state property assembly or actual battle execution.',
                              'The installed Power contribution constant is -100%, making its supplied layer numerically inert in this build; future constants require revalidation.',
                              'Source-attribution, target selection, critical roll, effect, BeHit, HP and independent gameplay holdout are separate.']}
    output = ROOT / 'research/evidence/pc-res151-player-tentacle-runtime.json'
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print('Wrote installed Player Tentacle evidence,', len(fixture['fixtures']), 'cases')


if __name__ == '__main__':
    main()
