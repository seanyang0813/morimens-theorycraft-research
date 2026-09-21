"""Carry MonsterBehaviorComp runtime fixtures to installed resource 150 when identical."""
import hashlib
import json
import os
from pathlib import Path

import UnityPy

from runtime_oracle import ROOT
from monster_skill_change_oracle import MonsterSkillChangeOracle


def sha_bytes(value):return hashlib.sha256(value).hexdigest()
def sha_path(path):return sha_bytes(path.read_bytes())


def main():
    fixture_path=ROOT/'tests/synthetic/original-monster-skill-change.json';fixture=json.loads(fixture_path.read_text(encoding='utf-8'))
    bundle=Path(os.environ.get('ProgramFiles(x86)',r'C:\Program Files (x86)'))/'Steam/steamapps/common/Morimens/_game_data_/DownLoad/share.ab'
    UnityPy.set_assetbundle_decrypt_key((ROOT/'research/raw/bundle-key.bin').read_bytes());payload=None
    for obj in UnityPy.load(str(bundle)).objects:
        if obj.type.name!='TextAsset':continue
        value=obj.read()
        if value.m_Name=='MonsterBehaviorComp.lua':payload=value.m_Script.encode('utf-8','surrogateescape') if isinstance(value.m_Script,str) else bytes(value.m_Script);break
    if payload is None:raise ValueError('Installed MonsterBehaviorComp.lua missing')
    installed=sha_bytes(payload);baseline=fixture['sourceHashes']['MonsterBehaviorComp']
    private=ROOT/'research/observations/current-res150-build51/modules/MonsterBehaviorComp.lua';private.parent.mkdir(parents=True,exist_ok=True);private.write_bytes(payload)
    oracle=MonsterSkillChangeOracle({'output':str(private.relative_to(ROOT)).replace('\\','/')})
    mismatches=[]
    for index,row in enumerate(fixture['fixtures']):
        actual=oracle.run_change(row['input']) if row['domain']=='ChangeSkill' else oracle.run_set_intention(row['input'])
        if actual!=row['expected']:mismatches.append({'index':index,'domain':row['domain']})
    output=ROOT/'research/evidence/pc-res150-monster-skill-change-runtime.json'
    report={'schemaVersion':1,'kind':'MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON','baselineBuild':'pc-res144-build51','currentBuild':'pc-res150-build51','method':'execute installed MonsterBehaviorComp against inherited ChangeSkill/SetIntention fixtures','status':'EXACT_MATCH_IN_FIXTURE_DOMAIN' if not mismatches else 'BEHAVIOR_CHANGE_CONFIRMED','sourceHashes':{'fixture':sha_path(fixture_path),'installedShareBundle':sha_path(bundle),'baselineMonsterBehaviorComp':baseline,'currentMonsterBehaviorComp':installed},'moduleStatus':'IDENTICAL' if installed==baseline else 'CHANGED','fixtures':len(fixture['fixtures']),'exactMatches':len(fixture['fixtures'])-len(mismatches),'mismatches':mismatches,'scope':'Actual installed MonsterBehaviorComp ChangeSkill and SetIntention executed against the inherited original-runtime fixture domain.','limitations':['Command constructor, skill table and event/log/preview endpoints are bounded adapters','No ActByIntention, transition skill execution, turn advancement, gameplay or holdout credit']}
    output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'status':report['status'],'fixtures':report['fixtures'],'exactMatches':report['exactMatches'],'output':str(output.relative_to(ROOT))},indent=2))


if __name__=='__main__':main()
