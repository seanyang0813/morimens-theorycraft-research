"""Index a private decoded replay with the recovered PC144 protocol catalog."""
from pathlib import Path
import argparse
import json
from replay_index import build_replay_index

ROOT=Path(__file__).resolve().parents[1]

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--input',required=True,type=Path);parser.add_argument('--output',required=True,type=Path);args=parser.parse_args()
    source=args.input.resolve();output=args.output.resolve()
    if not source.is_file():raise ValueError('Decoded replay input does not exist')
    try:output.relative_to(ROOT/'research'/'observations')
    except ValueError as error:raise ValueError('Replay index output must stay inside research/observations') from error
    if output.exists():raise FileExistsError('Refusing to overwrite replay index')
    artifact=json.loads(source.read_text(encoding='utf-8'));catalog=json.loads((ROOT/'research/evidence/replay-protocol.json').read_text(encoding='utf-8'));index=build_replay_index(artifact,catalog)
    output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(index,indent=2,ensure_ascii=False)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps({'output':str(output.relative_to(ROOT)),'records':index['counts']['records'],'events':index['counts']['events'],'initializations':len(index['initializations']),'propertyChanges':len(index['propertyChanges']),'stateEvents':len(index['stateEvents']),'cardUses':len(index['cardUses']),'hits':len(index['hits']),'actionSnapshots':len(index['actionSnapshots']),'snapshotBoundaryStatus':index['snapshotBoundaryStatus']},indent=2))

if __name__=='__main__':main()
