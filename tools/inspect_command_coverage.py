"""Static dependency inventory, never evaluates expressions or selects variants."""
import collections
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def inventory(commands, skills):
    effects = collections.Counter()
    fields = collections.Counter()
    per_command = {}
    for cid, command in commands.items():
        rows = command.get('data_list', {})
        types = collections.Counter()
        for row in rows.values():
            types[row.get('Type', '<missing>')] += 1
            fields.update(row.keys())
        effects.update(types)
        per_command[cid] = {'rowCount': len(rows), 'effectTypes': dict(sorted(types.items()))}
    links = []
    unresolved = []
    missing = []
    card_effects = collections.Counter()
    simple_damage = []
    for sid, skill in skills.items():
        ref = skill.get('CmdList')
        tags = list(skill.get('Type', {}).values())
        is_card = any(isinstance(t, str) and t.startswith('Card_') for t in tags)
        # A table may encode conditional or progression variants, not a list of commands.
        if type(ref) is not int:
            unresolved.append({'skillId': sid, 'referenceKind': type(ref).__name__, 'cardTagged': is_card})
            continue
        cid = str(ref)
        if cid not in commands:
            missing.append({'skillId': sid, 'commandId': cid})
            continue
        record = {'skillId': sid, 'commandId': cid, 'cardTagged': is_card, **per_command[cid]}
        links.append(record)
        if is_card:
            card_effects.update(record['effectTypes'])
            if set(record['effectTypes']) == {'BEActiveDamage'}:
                simple_damage.append(record)
    return {'commandCount': len(commands), 'skillCount': len(skills),
            'effectRowCounts': dict(effects.most_common()), 'rowFieldCounts': dict(fields.most_common()),
            'directCardReferenceEffectRowCounts': dict(card_effects.most_common()),
            'directSkillLinks': links, 'unresolvedSkillReferences': unresolved,
            'missingDirectReferences': missing, 'directCardActiveDamageOnlyCandidates': simple_damage}

def main():
    paths = {name: ROOT / 'research/extracted/config' / (name + '.json') for name in ('Cmd', 'Skill')}
    data = {name: json.loads(path.read_text(encoding='utf-8')) for name, path in paths.items()}
    report = {'schemaVersion': 1, 'build': 'pc-res144-build51', 'status': 'STATIC_INVENTORY_ONLY',
              'sourceHashes': {name: hashlib.sha256(path.read_bytes()).hexdigest() for name, path in paths.items()},
              'limitations': ['Counts cover exported tables, not reachable gameplay or mechanic coverage.',
                  'Only scalar integer CmdList references are linked; conditional/progression tables are unresolved.',
                  'Nested commands, state triggers, expressions, targets and timing are not traversed or executed.',
                  'Damage-only candidates still require argument, target, repeat and lifecycle reconstruction.',
                  'No skill is declared supported or gameplay-validated by this inventory.'],
              **inventory(data['Cmd'], data['Skill'])}
    destination = ROOT / 'research/evidence/command-coverage-inventory.json'
    destination.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps({k: report[k] for k in ('commandCount', 'skillCount')}))
    print('Direct links:', len(report['directSkillLinks']), 'unresolved:', len(report['unresolvedSkillReferences']),
          'missing:', len(report['missingDirectReferences']), 'damage-only candidates:', len(report['directCardActiveDamageOnlyCandidates']))
    print('Leading card effects:', list(report['directCardReferenceEffectRowCounts'].items())[:10])

if __name__ == '__main__':
    main()
