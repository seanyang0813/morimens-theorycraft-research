"""Run after-use lifecycle fixtures with resource-150 dependencies."""
import hashlib
import json

from after_use_card_oracle import AfterUseCardOracle, ROOT


def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    module_dir=ROOT/'research/observations/current-res150-build51/modules';comparison_path=ROOT/'research/evidence/pc-res144-to-res150-combat-build.json';card_path=ROOT/'research/evidence/pc-res150-card-modules.json';fixture_path=ROOT/'tests/synthetic/original-after-use-card.json';output=ROOT/'research/evidence/pc-res150-after-use-card-runtime.json'
    comparison=json.loads(comparison_path.read_text(encoding='utf-8'));cards=json.loads(card_path.read_text(encoding='utf-8'));combat={row['name']:row for row in comparison['combatModules']};card_rows={row['name']:row for row in cards['modules']};assets={};hashes={'comparison':sha(comparison_path),'cardModules':sha(card_path),'fixture':sha(fixture_path)}
    for name in ('BattleConst','BattleUtilServer'):
        path=module_dir/f'{name}.lua';expected=combat[f'{name}.lua']['current'][0]
        if sha(path)!=expected['sha256']:raise ValueError(f'Current module mismatch: {name}')
        assets[name]={'output':str(path.relative_to(ROOT)).replace('\\','/')};hashes[f'current{name}']=sha(path)
    if card_rows['BEAfterUseCard.lua']['status']!='IDENTICAL':raise ValueError('BEAfterUseCard equality required')
    fixture=json.loads(fixture_path.read_text(encoding='utf-8'));oracle=AfterUseCardOracle(assets);mismatches=[]
    for row in fixture['fixtures']:
        actual=oracle.run_after(row['input'])
        if actual!=row['expected']:mismatches.append({'input':row['input'],'baseline':row['expected'],'current':actual})
    total=len(fixture['fixtures']);report={'schemaVersion':1,'kind':'MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON','baselineBuild':'pc-res144-build51','currentBuild':'pc-res150-build51','method':'BEAfterUseCard.DoEffect and EffectEnd','status':'EXACT_MATCH_IN_FIXTURE_DOMAIN' if not mismatches else 'BEHAVIOR_CHANGE_DETECTED','sourceHashes':hashes,'fixtures':total,'exactMatches':total-len(mismatches),'mismatches':len(mismatches),'results':mismatches,'scope':'Byte-identical after-use module executed with resource-150 constants/utility across deck, stats, trigger, attached-event and cleanup branches.','limitations':['No event listeners, card-manager mutation internals, gameplay or holdout credit']}
    output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'status':report['status'],'fixtures':total,'exactMatches':report['exactMatches'],'output':str(output.relative_to(ROOT))},indent=2))


if __name__=='__main__':main()
