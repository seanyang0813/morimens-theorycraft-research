"""Compare resource-150 target/skill-phase TextAssets with resource 144."""
from pathlib import Path
import argparse
import hashlib
import json

import UnityPy

ROOT=Path(__file__).resolve().parents[1]
NAMES=('BEGenerateTargets.lua','BECreateSkillPhase.lua','BattleCmdServer.lua','BattleCmdParser.lua','BattleCmdTargetsExp.lua','BattleEffectServer.lua','BattleEffectMgrServer.lua')


def sha(data):return hashlib.sha256(data).hexdigest()


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--install-root',required=True,type=Path);parser.add_argument('--comparison',required=True,type=Path);parser.add_argument('--output',required=True,type=Path);args=parser.parse_args();output=args.output.resolve()
    try:output.relative_to(ROOT/'research/evidence')
    except ValueError as error:raise ValueError('Output must stay inside research/evidence') from error
    if output.exists():raise FileExistsError('Refusing to overwrite skill-phase comparison')
    comparison_path=args.comparison.resolve();comparison=json.loads(comparison_path.read_text(encoding='utf-8'))
    if comparison.get('currentBuild')!='pc-res150-build51':raise ValueError('Resource-150 build comparison required')
    index=json.loads((ROOT/'research/symbols/text-assets.json').read_text(encoding='utf-8'));baseline={row['name']:{'sha256':row['sha256'],'size':row['size']} for row in index if row['name'] in NAMES and 'downloaded' in str(row.get('bundle',''))}
    UnityPy.set_assetbundle_decrypt_key((ROOT/'research/raw/bundle-key.bin').read_bytes());current={};bundles={}
    for bundle_name in ('share.ab','gamescript.ab','foundation.ab'):
        path=args.install_root.resolve()/'_game_data_'/'DownLoad'/bundle_name;payload=path.read_bytes();bundles[bundle_name]={'sha256':sha(payload),'size':len(payload)}
        for obj in UnityPy.load(str(path)).objects:
            if obj.type.name!='TextAsset':continue
            value=obj.read()
            if value.m_Name not in NAMES:continue
            data=value.m_Script.encode('utf-8','surrogateescape') if isinstance(value.m_Script,str) else bytes(value.m_Script);current[value.m_Name]={'sha256':sha(data),'size':len(data)}
    rows=[{'name':name,'status':'IDENTICAL' if baseline.get(name)==current.get(name) and baseline.get(name) else 'CHANGED_OR_MISSING','baseline':baseline.get(name),'current':current.get(name)} for name in NAMES]
    report={'schemaVersion':1,'kind':'MORIMENS_PC_SKILL_PHASE_MODULE_COMPARISON','baselineBuild':'pc-res144-build51','currentBuild':'pc-res150-build51','sourceHashes':{'buildComparison':sha(comparison_path.read_bytes()),'bundles':bundles},'modules':rows,'status':'SELECTED_MODULES_IDENTICAL' if all(row['status']=='IDENTICAL' for row in rows) else 'REVALIDATION_REQUIRED','scope':'Hash-only comparison of target generation, skill-phase, command and scheduler TextAssets. No module code, account data, replay identifiers or credentials.','limitations':['Changed modules require method-level runtime checks','Equality does not connect a full card to gameplay','Holdout validation remains separate']}
    output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'status':report['status'],'modules':rows,'output':str(output.relative_to(ROOT))},indent=2))


if __name__=='__main__':main()
