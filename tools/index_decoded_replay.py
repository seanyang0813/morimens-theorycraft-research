"""Index a private decoded replay with the recovered PC144 protocol catalog."""
from pathlib import Path
import argparse
import json
from replay_index import build_replay_index
from replay_strategy_summary import ANALYSIS_TRACKS, build_strategy_summary

ROOT=Path(__file__).resolve().parents[1]

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--input',required=True,type=Path);parser.add_argument('--output',required=True,type=Path);parser.add_argument('--strategy-summary-output',type=Path);parser.add_argument('--analysis-track',choices=ANALYSIS_TRACKS);parser.add_argument('--strategy-label');parser.add_argument('--stage');parser.add_argument('--wave',type=int);parser.add_argument('--difficulty');parser.add_argument('--include-outcomes',action='store_true');args=parser.parse_args()
    source=args.input.resolve();output=args.output.resolve()
    if not source.is_file():raise ValueError('Decoded replay input does not exist')
    try:output.relative_to(ROOT/'research'/'observations')
    except ValueError as error:raise ValueError('Replay index output must stay inside research/observations') from error
    if output.exists():raise FileExistsError('Refusing to overwrite replay index')
    artifact=json.loads(source.read_text(encoding='utf-8'));catalog=json.loads((ROOT/'research/evidence/replay-protocol.json').read_text(encoding='utf-8'));index=build_replay_index(artifact,catalog)
    output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(index,indent=2,ensure_ascii=False)+'\n',encoding='utf-8',newline='\n')
    if args.strategy_summary_output:
        if not args.analysis_track:raise ValueError('--analysis-track is required with --strategy-summary-output')
        summary_output=args.strategy_summary_output.resolve()
        try:summary_output.relative_to(ROOT/'research'/'observations')
        except ValueError as error:raise ValueError('Strategy summary output must stay inside research/observations') from error
        if summary_output.exists():raise FileExistsError('Refusing to overwrite strategy summary')
        summary=build_strategy_summary(index,artifact.get('decoded',{}).get('resourceRecords',{}),analysis_track=args.analysis_track,label=args.strategy_label,stage=args.stage,wave=args.wave,difficulty=args.difficulty,include_outcomes=args.include_outcomes)
        summary_output.parent.mkdir(parents=True,exist_ok=True);summary_output.write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps({'output':str(output.relative_to(ROOT)),'records':index['counts']['records'],'events':index['counts']['events'],'initializations':len(index['initializations']),'propertyChanges':len(index['propertyChanges']),'stateEvents':len(index['stateEvents']),'cardUses':len(index['cardUses']),'hits':len(index['hits']),'actionSnapshots':len(index['actionSnapshots']),'snapshotBoundaryStatus':index['snapshotBoundaryStatus']},indent=2))

if __name__=='__main__':main()
