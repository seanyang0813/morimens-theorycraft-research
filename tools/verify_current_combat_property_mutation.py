"""Execute installed resource-150 property code over combat-mutation fixtures."""
import hashlib
import json
from pathlib import Path

from combat_property_mutation_oracle import CombatPropertyOracle
from runtime_oracle import ROOT

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def module_row(report,name):
    rows=[row for row in report['combatModules'] if row['name']==name]
    if len(rows)!=1 or len(rows[0].get('current') or [])!=1:raise ValueError(f'Unique current module required: {name}')
    return rows[0]

def main():
    module_dir=ROOT/'research/observations/current-res150-build51/modules';comparison_path=ROOT/'research/evidence/pc-res144-to-res150-combat-build.json';comparison=json.loads(comparison_path.read_text(encoding='utf-8'))
    assets={};hashes={}
    for name in ('BattleConst','BattleUtilServer','BattleCmdServer','BattlePropertyServer'):
        path=module_dir/f'{name}.lua';row=module_row(comparison,f'{name}.lua')
        if sha(path)!=row['current'][0]['sha256']:raise ValueError(f'Current module hash mismatch: {name}')
        assets[name]={'output':str(path.relative_to(ROOT)).replace('\\','/')};hashes[name]=sha(path)
    fixture_path=ROOT/'tests/synthetic/original-combat-property-mutation.json';fixture=json.loads(fixture_path.read_text(encoding='utf-8'));oracle=CombatPropertyOracle(assets);mismatches=[]
    for index,row in enumerate(fixture['fixtures']):
        actual=oracle.change_tentacle(row['input']) if row['input']['property']=='tentacle_dmg' else oracle.change(row['input'])
        if actual!=row['expected']:mismatches.append({'index':index,'property':row['input']['property']})
    report={'schemaVersion':1,'kind':'MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON','baselineBuild':'pc-res144-build51','currentBuild':'pc-res150-build51','status':'EXACT_MATCH_IN_FIXTURE_DOMAIN' if not mismatches else 'BEHAVIOR_CHANGE_CONFIRMED','fixtures':len(fixture['fixtures']),'exactMatches':len(fixture['fixtures'])-len(mismatches),'mismatches':mismatches,'sourceHashes':{'comparison':sha(comparison_path),'fixture':sha(fixture_path),'currentModules':hashes},'scope':'Actual installed resource-150 BattlePropertyServer with current constants/util/command dependencies over ordinary combat-property and tentacle-gate fixture domains.','limitations':['Explicit numeric property stores, crit scales and PvE/owner/tentacle-capacity context','No state construction, event dispatch, gameplay or holdout credit']}
    output=ROOT/'research/evidence/pc-res150-combat-property-mutation-runtime.json';output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'status':report['status'],'fixtures':report['fixtures'],'output':str(output.relative_to(ROOT))},indent=2))

if __name__=='__main__':main()
