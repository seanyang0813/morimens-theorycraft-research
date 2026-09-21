"""Bind phase-transition effect fixtures to installed resource-150 module bytes."""
import hashlib
import json
import os
from pathlib import Path

import UnityPy

from runtime_oracle import ROOT


def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    names=('BERemoveState.lua','BEMonsterChangeSkill.lua','BattleStateMgrServer.lua');module_dir=ROOT/'research/observations/current-res150-build51/modules'
    fixture_path=ROOT/'tests/synthetic/original-phase-transition-effects.json';fixture=json.loads(fixture_path.read_text(encoding='utf-8'));output=ROOT/'research/evidence/pc-res150-phase-transition-effects-runtime.json'
    program_files=Path(os.environ.get('ProgramFiles(x86)',r'C:\Program Files (x86)'));bundle_path=program_files/'Steam/steamapps/common/Morimens/_game_data_/DownLoad/share.ab'
    UnityPy.set_assetbundle_decrypt_key((ROOT/'research/raw/bundle-key.bin').read_bytes());installed={}
    for obj in UnityPy.load(str(bundle_path)).objects:
        if obj.type.name!='TextAsset':continue
        value=obj.read()
        if value.m_Name not in names:continue
        payload=value.m_Script.encode('utf-8','surrogateescape') if isinstance(value.m_Script,str) else bytes(value.m_Script);installed[value.m_Name]=hashlib.sha256(payload).hexdigest()
    if set(installed)!=set(names):raise ValueError('Missing installed phase-transition module')
    for name in names:
        copied=sha(module_dir/name);baseline=fixture['sourceHashes'][name.removesuffix('.lua')]
        if copied!=installed[name] or copied!=baseline:raise ValueError(f'Phase-transition module differs: {name}')
    report={'schemaVersion':1,'kind':'MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON','baselineBuild':'pc-res144-build51','currentBuild':'pc-res150-build51','method':'byte-identical phase-transition effect modules carry original-runtime fixtures forward','status':'BYTE_IDENTICAL_FIXTURES_CARRIED_FORWARD','sourceHashes':{'fixture':sha(fixture_path),'installedShareBundle':sha(bundle_path),'modules':installed},'fixtures':len(fixture['fixtures']),'carriedForward':len(fixture['fixtures']),'scope':'Installed BERemoveState, BEMonsterChangeSkill and BattleStateMgrServer bytes exactly match the modules used by the original-runtime fixture suite.','limitations':['State LifeEnd and event creation are observers in the inherited fixtures','No property removal, skill-component internals, scheduler, gameplay or holdout credit']}
    output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'status':report['status'],'fixtures':report['fixtures'],'output':str(output.relative_to(ROOT))},indent=2))


if __name__=='__main__':main()
