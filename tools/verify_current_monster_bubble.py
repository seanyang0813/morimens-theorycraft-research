"""Execute the installed resource-150 BEMonsterBubble over inherited fixtures."""
import hashlib
import json

from monster_bubble_oracle import MonsterBubbleOracle
from runtime_oracle import ROOT

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    module=ROOT/'research/observations/current-res150-build51/modules/BEMonsterBubble.lua'
    fixture_path=ROOT/'tests/synthetic/original-monster-bubble.json';fixture=json.loads(fixture_path.read_text(encoding='utf-8'))
    comparison_path=ROOT/'research/evidence/pc-res144-to-res150-combat-build.json';comparison=json.loads(comparison_path.read_text(encoding='utf-8'))
    if sha(module)!=fixture['sourceHash']:raise ValueError('Installed and baseline BEMonsterBubble hashes differ')
    oracle=MonsterBubbleOracle({'output':str(module.relative_to(ROOT)).replace('\\','/')});mismatches=[]
    for index,row in enumerate(fixture['fixtures']):
        actual=oracle.evaluate(row['input'])
        if actual!=row['expected']:mismatches.append({'index':index})
    report={'schemaVersion':1,'kind':'MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON','baselineBuild':'pc-res144-build51','currentBuild':'pc-res150-build51','status':'EXACT_MATCH_IN_FIXTURE_DOMAIN' if not mismatches else 'BEHAVIOR_CHANGE_CONFIRMED','moduleStatus':'IDENTICAL','fixtures':len(fixture['fixtures']),'exactMatches':len(fixture['fixtures'])-len(mismatches),'mismatches':mismatches,'sourceHashes':{'baselineModule':fixture['sourceHash'],'currentModule':sha(module),'comparison':sha(comparison_path),'installedShareBundle':comparison['sourceHashes']['bundles']['share.ab']['sha256'],'fixture':sha(fixture_path)},'scope':'Actual installed resource-150 BEMonsterBubble.DoEffect over inherited eligibility, default-time and record-routing fixtures.','limitations':['Explicit target/type and record-manager adapters','No scheduler, rendering client, gameplay or holdout credit']}
    output=ROOT/'research/evidence/pc-res150-monster-bubble-runtime.json';output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'status':report['status'],'fixtures':report['fixtures'],'output':str(output.relative_to(ROOT))},indent=2))

if __name__=='__main__':main()
