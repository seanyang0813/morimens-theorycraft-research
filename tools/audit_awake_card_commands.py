"""Audit Card_Awake command effect types across pinned and current PC catalogs."""
from pathlib import Path
from collections import Counter
import argparse
import hashlib
import json
import UnityPy

ROOT=Path(__file__).resolve().parents[1]
DAMAGE_TYPES={'BEActiveDamage','BEActiveDamage.State','BEPassiveDamage','BEFixedDamage','BEPureDamage','BETentacleAttack'}


def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def values(value):
    if isinstance(value,dict):return list(value.values())
    if isinstance(value,list):return value
    if isinstance(value,(str,int,float)):return [value]
    return []


def audit(skills,commands):
    selected=[];command_ids=set();effects=Counter();missing=[]
    for skill_id,skill in skills.items():
        if 'Card_Awake' not in values(skill.get('Type')):continue
        selected.append(skill_id)
        for field in ('CmdList','tempCmdList'):
            for command_id in values(skill.get(field)):
                command_id=str(command_id);command_ids.add(command_id);command=commands.get(command_id)
                if not isinstance(command,dict):missing.append(command_id);continue
                for row in values(command.get('data_list')):
                    if isinstance(row,dict):effects[str(row.get('Type'))]+=1
    direct={name:count for name,count in effects.items() if name in DAMAGE_TYPES}
    return {'awakeSkills':len(selected),'linkedCommands':len(command_ids),'commandRows':sum(effects.values()),
            'effectTypeCounts':dict(sorted(effects.items())),'missingCommands':len(missing),
            'directDamageRows':sum(direct.values()),'directDamageTypeCounts':dict(sorted(direct.items()))}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--current-dir',required=True,type=Path);parser.add_argument('--config-bundle',required=True,type=Path);parser.add_argument('--comparison',required=True,type=Path);parser.add_argument('--output',required=True,type=Path);args=parser.parse_args()
    current=args.current_dir.resolve();bundle=args.config_bundle.resolve();comparison_path=args.comparison.resolve();output=args.output.resolve()
    try:current.relative_to(ROOT/'research/observations');output.relative_to(ROOT/'research/evidence')
    except ValueError as error:raise ValueError('Private current inputs must stay in observations and output in evidence') from error
    comparison=json.loads(comparison_path.read_text(encoding='utf-8'))
    if comparison.get('currentBuild')!='pc-res150-build51':raise ValueError('Resource-150 build comparison required')
    key=ROOT/'research/raw/bundle-key.bin';UnityPy.set_assetbundle_decrypt_key(key.read_bytes())
    extracted={}
    for obj in UnityPy.load(str(bundle)).objects:
        if obj.type.name!='TextAsset':continue
        value=obj.read()
        if value.m_Name not in ('Skill.lua','Cmd.lua'):continue
        data=value.m_Script.encode('utf-8','surrogateescape') if isinstance(value.m_Script,str) else bytes(value.m_Script)
        extracted[value.m_Name]=hashlib.sha256(data).hexdigest()
    for name in ('Skill','Cmd'):
        if extracted.get(name+'.lua')!=sha(current/f'{name}.lua'):raise ValueError(f'Private {name} chunk does not match installed config bundle')
    sources={'installedConfigBundle':sha(bundle),'buildComparison':sha(comparison_path)}
    builds={}
    for build,skill_path,cmd_path in [
        ('pc-res144-build51',ROOT/'research/extracted/config/Skill.json',ROOT/'research/extracted/config/Cmd.json'),
        ('pc-res150-build51',current/'Skill.json',current/'Cmd.json')]:
        skills=json.loads(skill_path.read_text(encoding='utf-8'));commands=json.loads(cmd_path.read_text(encoding='utf-8'))
        builds[build]=audit(skills,commands);sources[build]={'skillExport':sha(skill_path),'cmdExport':sha(cmd_path)}
        for name in ('Skill','Cmd'):
            chunk=current/f'{name}.lua' if build=='pc-res150-build51' else None
            if chunk:sources[build][name.lower()+'Chunk']=sha(chunk)
    report={'schemaVersion':1,'kind':'MORIMENS_AWAKE_CARD_COMMAND_AUDIT','builds':builds,'sourceHashes':sources,
            'claimBoundary':'Card_Awake is a command-category audit. Absence of direct damage rows does not make its state, resource, card, tentacle or nested-command effects supported by the simulator.',
            'limitations':['Effect type is read from directly linked command rows only','Nested execute/run-card/custom commands require separate traversal','No runtime execution or gameplay validation']}
    output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps({'builds':builds,'output':str(output.relative_to(ROOT))},indent=2))


if __name__=='__main__':main()
