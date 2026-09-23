"""Count only source-attributable PvE Tentacle snapshots; no damage prediction.

The private replay archive stays ignored. The public report has aggregate counts and
file commitments, with no player, replay or instance identifiers.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'research/evidence/tentacle-replay-coverage.json'


def main():
    summary = dict(replaysScanned=0, completeTentacleHits=0, hitBearingReplays=0,
                   hitBearingActions=0, snapshotCardTidMatch=0,
                   casterOwnerMatch=0, skillTidMatch=0, bothIdentityMatch=0,
                   directImmediateTentacleRows=0, directNestedOrUnsupported=0)
    digest = hashlib.sha256()
    hit_actions = set()
    for n in range(71, 173):
        folder = ROOT / f'research/observations/replay-batch-{n:02d}'
        index_file = folder / 'compact-index.json'
        if not index_file.exists():
            raise FileNotFoundError(index_file)
        data = index_file.read_bytes()
        digest.update(n.to_bytes(2, 'big'))
        digest.update(hashlib.sha256(data).digest())
        index = json.loads(data)
        summary['replaysScanned'] += 1
        direct_actions = []
        replay_hits = 0
        for action in index.get('actionSnapshots', []):
            hits = {(hit.get('recordIndex'), hit.get('frameIndex')): hit
                    for hit in action.get('window', {}).get('hits', [])}
            for snapshot in action.get('window', {}).get('hitSnapshots', []):
                if snapshot.get('boundaryStatus') != 'COMPLETE':
                    continue
                hit = hits.get((snapshot.get('recordIndex'), snapshot.get('frameIndex')))
                config = (hit or {}).get('data', {}).get('beHitConfig', {})
                if config.get('damageType') != 3:
                    continue
                summary['completeTentacleHits'] += 1
                replay_hits += 1
                hit_actions.add((n, action['actionIndex']))
                card = action.get('cards', {}).get(str(action.get('cardUid')))
                if not card:
                    continue
                live_card = snapshot.get('cards', {}).get(str(action.get('cardUid')))
                if live_card and live_card.get('tid') == card.get('tid'):
                    summary['snapshotCardTidMatch'] += 1
                owner_match = config.get('castRoleUid') == card.get('ownerUid')
                skill_match = config.get('skillConfigId') == card.get('tid')
                summary['casterOwnerMatch'] += owner_match
                summary['skillTidMatch'] += skill_match
                if owner_match and skill_match:
                    summary['bothIdentityMatch'] += 1
                    direct_actions.append(card['tid'])
        if replay_hits:
            summary['hitBearingReplays'] += 1
        if direct_actions:
            embedded = json.loads((folder / 'decoded.json').read_text(encoding='utf-8'))['decoded']['resourceRecords']
            for tid in direct_actions:
                skill = embedded.get('Skill', {}).get(str(tid))
                command = embedded.get('Cmd', {}).get(str(skill.get('CmdList'))) if skill else None
                rows = [row for row in (command or {}).get('data_list', []) if row.get('Type') == 'BETentacleAttack']
                if len(rows) == 1:
                    summary['directImmediateTentacleRows'] += 1
                else:
                    summary['directNestedOrUnsupported'] += 1
    summary['hitBearingActions'] = len(hit_actions)
    expected = dict(replaysScanned=102, completeTentacleHits=905, hitBearingReplays=17,
                    hitBearingActions=204, snapshotCardTidMatch=889,
                    casterOwnerMatch=204, skillTidMatch=58, bothIdentityMatch=58,
                    directImmediateTentacleRows=39, directNestedOrUnsupported=19)
    if summary != expected:
        raise ValueError(f'Tentacle corpus changed or count assumption failed: {summary}')
    report = {'schemaVersion': 1, 'kind': 'MORIMENS_RETROSPECTIVE_TENTACLE_COVERAGE',
              'analysisTrack': 'verification', 'status': 'SOURCE_ATTRIBUTION_ONLY',
              'recordedCombatBuild': None, 'corpusIndexCommitmentSha256': digest.hexdigest(),
              'summary': summary,
              'method': 'Match complete damage-type-3 hit snapshots to same-frame hit records; compare recorded caster/skill identity with the played card, then inspect only embedded command rows for both-identity matches.',
              'limitations': [
                  'No Tentacle damage value is predicted or compared here; no independent holdout or publication credit.',
                  'Most Tentacle hits are triggered effects and cannot be attributed to the played card by immediate caster/skill identity.',
                  'An immediate BETentacleAttack row establishes a source candidate, not complete parameter, crit, target, state, or HP reconstruction.',
                  'The recorded combat build is unknown; all source records and identifiers remain private.']}
    OUTPUT.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(summary))


if __name__ == '__main__':
    main()
