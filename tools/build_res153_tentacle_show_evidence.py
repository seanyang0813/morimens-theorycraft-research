"""Publish hashes and narrow method parity without publishing Lua or replay IDs."""
import hashlib
import json
import struct
from pathlib import Path

from audit_tentacle_source_parity import ROOT, original_method, installed_method


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    before = ROOT / 'research/observations/current-res151-build51/modules'
    after = ROOT / 'research/observations/current-res153-build51/modules'
    names = ('BattleUnitPlayer.lua', 'BattleCmdParser.lua')
    for name in names:
        if (before / name).read_bytes() != (after / name).read_bytes():
            raise ValueError(f'Current resource-153 {name} differs from resource 151')
    markers = [('BattleUnitPlayer.lua', 'GetShowTentacleDamage {curDmg}', 'PvE show-damage producer'),
               ('BattleCmdParser.lua', 'GetShowTentacleDamage', 'PlayerRole.tentacle_dmg_show parser alias')]
    methods = []
    for name, marker, label in markers:
        old = original_method(name, marker)
        current, _ = installed_method(name, marker)
        old_body, current_body = old['instructions_decoded'][1:], current['instructions_decoded'][1:]
        if old['constants'] != current['constants'] or old['constant_tags'] != current['constant_tags'] or old_body != current_body:
            raise ValueError(f'Original and installed method differ: {label}')
        methods.append({'module': name, 'method': label,
                        'instructionCountExcludingSyntheticPrefix': len(current_body),
                        'decodedBodySha256': hashlib.sha256(struct.pack('<' + 'I' * len(current_body), *current_body)).hexdigest()})
    fixture = ROOT / 'tests/synthetic/installed-player-tentacle-show-damage.json'
    cases = json.loads(fixture.read_text(encoding='utf-8'))
    if cases['method'] != 'BattleUnitPlayer.GetShowTentacleDamage' or len(cases['fixtures']) != 300:
        raise ValueError('Expected 300 original-runtime show-damage fixtures')
    version = ROOT / 'research/evidence/pc-res144-to-res153-combat-build.json'
    report = {'schemaVersion': 1, 'kind': 'MORIMENS_RES153_TENTACLE_SHOW_ALIAS_EVIDENCE',
              'status': 'SELECTED_METHOD_BODIES_IDENTICAL_AND_RUNTIME_FIXTURES_AVAILABLE',
              'build': 'pc-res153-build51', 'installedBuildEvidenceSha256': sha(version),
              'modules': [{'name': name, 'resource151Sha256': sha(before / name),
                           'resource153Sha256': sha(after / name), 'byteIdentical': True} for name in names],
              'methods': methods, 'runtimeFixtures': {'count': 300, 'sha256': sha(fixture)},
              'scope': 'GetShowTentacleDamage PvE producer and PlayerRole.tentacle_dmg_show expression alias only; complete live-property inputs required.',
              'limitations': ['Show damage is an expression input, not the final combat Tentacle damage.',
                              'Synthetic original-runtime cases and historical replay matches are not independent gameplay validation.',
                              'No recorded-combat-build attribution or blind holdout follows.']}
    output = ROOT / 'research/evidence/pc-res153-tentacle-show-alias.json'
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print('Tentacle show source parity:', len(methods), 'methods;', len(cases['fixtures']), 'runtime cases')


if __name__ == '__main__':
    main()
