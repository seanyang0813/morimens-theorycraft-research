"""Compare resource-150 BattleEngine event-effect requests with baseline fixtures."""
from pathlib import Path
import hashlib
import json

from engine_event_oracle import EngineEventOracle, ROOT


def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    module_dir=ROOT/'research/observations/current-res150-build51/modules';comparison_path=ROOT/'research/evidence/pc-res144-to-res150-combat-build.json';fixture_path=ROOT/'tests/synthetic/original-engine-event.json';output=ROOT/'research/evidence/pc-res150-engine-event-runtime.json'
    comparison=json.loads(comparison_path.read_text(encoding='utf-8'));names=('BattleConst','BattleUtilServer','BattleCmdServer','BattlePropertyServer','BattleEngine');assets={};hashes={'comparison':sha(comparison_path),'fixture':sha(fixture_path)}
    for name in names:
        path=module_dir/f'{name}.lua';rows=[row for row in comparison['combatModules'] if row['name']==f'{name}.lua']
        if len(rows)!=1 or len(rows[0].get('current') or [])!=1 or sha(path)!=rows[0]['current'][0]['sha256']:raise ValueError(f'Current module mismatch: {name}')
        assets[name]={'output':str(path.relative_to(ROOT)).replace('\\','/')};hashes[f'current{name}']=sha(path)
    fixtures=json.loads(fixture_path.read_text(encoding='utf-8'))['fixtures'];oracle=EngineEventOracle(assets);mismatches=[]
    for row in fixtures:
        actual=oracle.run_event(row['input'])
        if actual!=row['expected']:mismatches.append({'input':row['input'],'baseline':row['expected'],'current':actual})
    report={'schemaVersion':1,'kind':'MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON','baselineBuild':'pc-res144-build51','currentBuild':'pc-res150-build51','method':'BattleEngine.CreateEventEffect','status':'EXACT_MATCH_IN_FIXTURE_DOMAIN' if not mismatches else 'BEHAVIOR_CHANGE_DETECTED','sourceHashes':hashes,'fixtures':len(fixtures),'exactMatches':len(fixtures)-len(mismatches),'mismatches':len(mismatches),'results':mismatches,'scope':'Actual resource-150 event-effect request construction with explicit auto-operation result, absent/present payload and observed effect-manager request.','limitations':['No effect construction, scheduler traversal, event dispatch, listeners, gameplay or holdout credit']}
    output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'status':report['status'],'fixtures':len(fixtures),'exactMatches':report['exactMatches'],'output':str(output.relative_to(ROOT))},indent=2))


if __name__=='__main__':main()
