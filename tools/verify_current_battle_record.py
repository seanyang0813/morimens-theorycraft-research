"""Compare selected resource-150 BattleRecord constructors with baseline fixtures."""
from pathlib import Path
import hashlib
import json

from battle_record_oracle import BattleRecordOracle, ROOT


def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    module=ROOT/'research/observations/current-res150-build51/modules/BattleRecord.lua';comparison_path=ROOT/'research/evidence/pc-res144-to-res150-combat-build.json';fixture_path=ROOT/'tests/synthetic/original-battle-record.json';output=ROOT/'research/evidence/pc-res150-battle-record-runtime.json'
    comparison=json.loads(comparison_path.read_text(encoding='utf-8'));row=next(item for item in comparison['combatModules'] if item['name']=='BattleRecord.lua')
    if sha(module)!=row['current'][0]['sha256']:raise ValueError('Current BattleRecord module mismatch')
    fixture=json.loads(fixture_path.read_text(encoding='utf-8'));oracle=BattleRecordOracle({'BattleRecord':{'output':str(module.relative_to(ROOT)).replace('\\','/')}});mismatches=[]
    domains=(('frame',fixture['fixtures'],oracle.run_case),('queue',fixture['queueFixtures'],oracle.run_queue_case));total=sum(len(rows) for _,rows,_ in domains)
    for domain,rows,runner in domains:
        for case in rows:
            actual=runner(case['input'])
            if actual!=case['expected']:mismatches.append({'domain':domain,'input':case['input'],'baseline':case['expected'],'current':actual})
    report={'schemaVersion':1,'kind':'MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON','baselineBuild':'pc-res144-build51','currentBuild':'pc-res150-build51','method':'BattleRecord selected frame and queue boundaries','status':'EXACT_MATCH_IN_FIXTURE_DOMAIN' if not mismatches else 'BEHAVIOR_CHANGE_DETECTED','sourceHashes':{'comparison':sha(comparison_path),'fixture':sha(fixture_path),'currentBattleRecord':sha(module)},'fixtures':total,'domains':{name:{'fixtures':len(rows),'exactMatches':len(rows)-sum(item['domain']==name for item in mismatches)} for name,rows,_ in domains},'exactMatches':total-len(mismatches),'mismatches':len(mismatches),'results':mismatches,'scope':'Actual resource-150 selected BattleRecord card-use, hit, property, target and state frame constructors plus record queue and battle-cut dispatch.','limitations':['No transport serialization, replay playback, gameplay or holdout credit']}
    output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'status':report['status'],'fixtures':report['fixtures'],'exactMatches':report['exactMatches'],'output':str(output.relative_to(ROOT))},indent=2))


if __name__=='__main__':main()
