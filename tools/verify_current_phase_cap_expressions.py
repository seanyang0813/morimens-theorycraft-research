"""Execute resource-150 FuncTable over the phase-cap expression fixture domain."""
import hashlib
import json
import os
from pathlib import Path

import UnityPy

from phase_cap_expression_oracle import PhaseCapExpressionOracle, ROOT


def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    module_dir=ROOT/'research/observations/current-res150-build51/modules';func_path=module_dir/'FuncTable.lua';cmd_path=module_dir/'Cmd.json'
    fixture_path=ROOT/'tests/synthetic/original-phase-cap-expressions.json';output=ROOT/'research/evidence/pc-res150-phase-cap-expressions-runtime.json'
    program_files=Path(os.environ.get('ProgramFiles(x86)',r'C:\Program Files (x86)'));bundle_path=program_files/'Steam/steamapps/common/Morimens/_game_data_/DownLoad/config.ab'
    UnityPy.set_assetbundle_decrypt_key((ROOT/'research/raw/bundle-key.bin').read_bytes());matches=[]
    for obj in UnityPy.load(str(bundle_path)).objects:
        if obj.type.name!='TextAsset':continue
        value=obj.read()
        if value.m_Name!='FuncTable.lua':continue
        matches.append(value.m_Script.encode('utf-8','surrogateescape') if isinstance(value.m_Script,str) else bytes(value.m_Script))
    if len(matches)!=1 or hashlib.sha256(matches[0]).hexdigest()!=sha(func_path):raise ValueError('Current FuncTable copy does not match installed config bundle')
    fixture=json.loads(fixture_path.read_text(encoding='utf-8'));commands=json.loads(cmd_path.read_text(encoding='utf-8'));oracle=PhaseCapExpressionOracle({'output':str(func_path.relative_to(ROOT)).replace('\\','/')});mismatches=[]
    for row in fixture['fixtures']:
        case=row['input'];actual=oracle.run(commands[str(case['commandId'])]['data_list'],case)
        if actual!=row['expected']:mismatches.append({'input':case,'baseline':row['expected'],'current':actual})
    report={'schemaVersion':1,'kind':'MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON','baselineBuild':'pc-res144-build51','currentBuild':'pc-res150-build51','method':'compiled FuncTable closures for commands 60406 and 60405','status':'EXACT_MATCH_IN_FIXTURE_DOMAIN' if not mismatches else 'BEHAVIOR_CHANGE_DETECTED','sourceHashes':{'fixture':sha(fixture_path),'installedConfigBundle':sha(bundle_path),'currentFuncTable':sha(func_path),'currentCmdCatalog':sha(cmd_path)},'fixtures':len(fixture['fixtures']),'exactMatches':len(fixture['fixtures'])-len(mismatches),'mismatches':len(mismatches),'results':mismatches,'scope':'Actual installed resource-150 FuncTable bytecode executes every condition and parameter expression used by the exact current 60406/60405 command rows over the inherited phase-cap boundary domain.','limitations':['Python iterates rows and applies separately recovered integer mutations','No original parser, effect constructor/body, state manager or scheduler','No gameplay or holdout credit']}
    output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'status':report['status'],'fixtures':report['fixtures'],'exactMatches':report['exactMatches'],'output':str(output.relative_to(ROOT))},indent=2))


if __name__=='__main__':main()
