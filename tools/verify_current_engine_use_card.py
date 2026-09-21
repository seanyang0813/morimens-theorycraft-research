"""Compare resource-150 BattleEngine.lg_UseCard with baseline fixtures."""
import hashlib
import json

from engine_use_card_oracle import EngineUseCardOracle, ROOT


def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    module=ROOT/'research/observations/current-res150-build51/modules/BattleEngine.lua';comparison_path=ROOT/'research/evidence/pc-res144-to-res150-combat-build.json';fixture_path=ROOT/'tests/synthetic/original-engine-use-card.json';output=ROOT/'research/evidence/pc-res150-engine-use-card-runtime.json'
    comparison=json.loads(comparison_path.read_text(encoding='utf-8'));row=next(item for item in comparison['combatModules'] if item['name']=='BattleEngine.lua')
    if sha(module)!=row['current'][0]['sha256']:raise ValueError('Current BattleEngine module mismatch')
    fixture=json.loads(fixture_path.read_text(encoding='utf-8'));oracle=EngineUseCardOracle({'BattleEngine':{'output':str(module.relative_to(ROOT)).replace('\\','/')}});mismatches=[]
    for case in fixture['fixtures']:
        actual=oracle.run_use(case['input'])
        if actual!=case['expected']:mismatches.append({'input':case['input'],'baseline':case['expected'],'current':actual})
    total=len(fixture['fixtures']);report={'schemaVersion':1,'kind':'MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON','baselineBuild':'pc-res144-build51','currentBuild':'pc-res150-build51','method':'BattleEngine.lg_UseCard','status':'EXACT_MATCH_IN_FIXTURE_DOMAIN' if not mismatches else 'BEHAVIOR_CHANGE_DETECTED','sourceHashes':{'comparison':sha(comparison_path),'fixture':sha(fixture_path),'currentBattleEngine':sha(module)},'fixtures':total,'exactMatches':total-len(mismatches),'mismatches':len(mismatches),'results':mismatches,'scope':'Actual resource-150 use-card dispatch across six branch scenarios with explicit card/player adapters.','limitations':['No payment, effect execution, HP, gameplay or network send']}
    output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'status':report['status'],'fixtures':total,'exactMatches':report['exactMatches'],'output':str(output.relative_to(ROOT))},indent=2))


if __name__=='__main__':main()
