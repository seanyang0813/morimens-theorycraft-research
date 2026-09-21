"""Run inherited ordinary PvE Defend Block fixtures on resource-150 bytecode."""
import hashlib
import json

from connected_block_calculation_oracle import BlockOracle
from runtime_oracle import ROOT


def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    module_dir=ROOT/'research/observations/current-res150-build51/modules';fixture_path=ROOT/'tests/synthetic/original-connected-block-calculation.json';output=ROOT/'research/evidence/pc-res150-connected-block-calculation.json'
    names=('BattleConst','BattleUtilServer','BattleCmdServer');assets={name:{'output':str(module_dir/f'{name}.lua')} for name in names}
    for name in names:
        if not (module_dir/f'{name}.lua').is_file():raise FileNotFoundError(f'Missing current module: {name}')
    fixture=json.loads(fixture_path.read_text(encoding='utf-8'));oracle=BlockOracle(assets);mismatches=[]
    for index,row in enumerate(fixture['fixtures']):
        actual=oracle.run(row['input'])
        if actual!=row['expected']:mismatches.append({'index':index,'baseline':row['expected'],'current':actual})
    report={'schemaVersion':1,'kind':'MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON','baselineBuild':'pc-res144-build51','currentBuild':'pc-res150-build51','method':'BattleCmdServer.GetRealBlock ordinary Camp1 PvE Card_Defend branch','status':'EXACT_MATCH_IN_FIXTURE_DOMAIN' if not mismatches else 'BEHAVIOR_CHANGE_DETECTED','sourceHashes':{'fixture':sha(fixture_path),**{f'current{name}':sha(module_dir/f'{name}.lua') for name in names}},'fixtures':len(fixture['fixtures']),'exactMatches':len(fixture['fixtures'])-len(mismatches),'mismatches':len(mismatches),'results':mismatches,'scope':'Installed resource-150 constants, utility and command bytecode over inherited ordinary Camp1 PvE Awakener instruction-card Block calculation fixtures.','limitations':['Explicit complete property adapters, Card_Defend tag, selected recipient and ParaPlus; no effect repetition, storage/events, full command or card lifecycle','Synthetic cross-build comparison; no gameplay or holdout credit']}
    output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'status':report['status'],'fixtures':report['fixtures'],'exactMatches':report['exactMatches'],'output':str(output.relative_to(ROOT))},indent=2))


if __name__=='__main__':main()
