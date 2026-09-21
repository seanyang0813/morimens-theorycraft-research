"""Build a minimal private replay index for the strict damage-candidate adapter.

The ordinary replay index intentionally retains rich event windows and can grow
past JavaScript's maximum string size. This adapter rebuilds the authoritative
index from the decoded replay, then writes only fields read by
engine/replay-action-candidate.mjs. It never makes the artifact public.
"""
from pathlib import Path
import argparse
import json

from replay_index import build_replay_index

ROOT=Path(__file__).resolve().parents[1]


def compact_candidate_index(index):
    actions=[]
    for action in index.get('actionSnapshots',[]):
        card_uid=action.get('cardUid')
        card=(action.get('cards') or {}).get(str(card_uid))
        window=action.get('window') or {}
        snapshots=[]
        for hit in window.get('hitSnapshots',[]):
            hit_card=(hit.get('cards') or {}).get(str(card_uid))
            snapshots.append({
                key:hit[key] for key in ('hitIndex','recordIndex','frameIndex','boundaryStatus','roles','activeStates','hitData','reconstruction') if key in hit
            } | {'cards':{} if hit_card is None else {str(card_uid):hit_card}})
        actions.append({
            key:action[key] for key in ('actionIndex','boundaryStatus','cardUid','camp') if key in action
        } | {
            'cards':{} if card is None else {str(card_uid):card},
            'window':{
                'selectedTargetCommands':window.get('selectedTargetCommands',[]),
                'hits':window.get('hits',[]),
                'hitSnapshots':snapshots,
            },
        })
    return {
        'schemaVersion':1,
        'kind':index.get('kind'),
        'build':index.get('build'),
        'inputSha256':index.get('inputSha256'),
        'candidateAdapterScope':'Fields read by engine/replay-action-candidate.mjs; outcomes retained for retrospective audit',
        'summary':{
            'completeHitSnapshots':sum(1 for row in index.get('hitSnapshots',[]) if row.get('boundaryStatus')=='COMPLETE'),
        },
        'actionSnapshots':actions,
    }


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--decoded-replay',required=True,type=Path)
    parser.add_argument('--output',required=True,type=Path)
    args=parser.parse_args()
    source=args.decoded_replay.resolve();output=args.output.resolve()
    if not source.is_file():raise ValueError('Decoded replay input does not exist')
    try:output.relative_to(ROOT/'research'/'observations')
    except ValueError as error:raise ValueError('Compact candidate index must stay inside private research/observations') from error
    if output.exists():raise FileExistsError('Refusing to overwrite compact candidate index')
    artifact=json.loads(source.read_text(encoding='utf-8'))
    catalog=json.loads((ROOT/'research/evidence/replay-protocol.json').read_text(encoding='utf-8'))
    compact=compact_candidate_index(build_replay_index(artifact,catalog))
    output.write_text(json.dumps(compact,separators=(',',':'),ensure_ascii=False)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps({'output':str(output.relative_to(ROOT)),'actions':len(compact['actionSnapshots']),'bytes':output.stat().st_size},separators=(',',':')))


if __name__=='__main__':main()
