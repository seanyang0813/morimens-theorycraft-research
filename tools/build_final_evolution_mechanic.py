"""Publish the identifier-free Final Evolution catalog trace across PC builds."""
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'research/extracted/config'
CURRENT=ROOT/'research/observations/current-res150-build51/modules'

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def clean(value):
    if isinstance(value,dict):return {key:clean(item) for key,item in value.items() if key!='BaseSortID'}
    if isinstance(value,list):return [clean(item) for item in value]
    return value

def main():
    names=('Skill','Cmd','State');base={};current={}
    for name in names:
        base[name]=json.loads((BASE/f'{name}.json').read_text(encoding='utf-8'))
        current[name]=json.loads((CURRENT/f'{name}.json').read_text(encoding='utf-8'))
    selected={'Skill':['60397'],'Cmd':['60401','60402'],'State':['60089','2900','60404','60083']}
    rows={};matches=[]
    for name,ids in selected.items():
        rows[name]={}
        for identity in ids:
            baseline=clean(base[name][identity]);installed=clean(current[name][identity])
            if baseline!=installed:raise ValueError(f'Current {name} {identity} differs from baseline beyond BaseSortID')
            rows[name][identity]=baseline;matches.append(f'{name}:{identity}')
    report={'schemaVersion':1,'kind':'MORIMENS_HIGH_DIFFICULTY_MECHANIC_TRACE','analysisTrack':'mechanics','baselineBuild':'pc-res144-build51','currentBuild':'pc-res150-build51','status':'EXACT_CATALOG_MATCH','mechanic':'Ghost-faced dog Final Evolution','sourceHashes':{
        'baseline':{name:sha(BASE/f'{name}.json') for name in names},'currentPrivateExports':{name:sha(CURRENT/f'{name}.json') for name in names}},
        'normalizedMatches':matches,'rows':rows,
        'derived':{'skillArgument':'ceil(CmdCaster.atk * 0.08) through the separately verified ordinary skill-argument path','onSkillExecution':['add 20 layers of state 60089 permanent Reinforce','add Arg1 layers of state 2900 Strength','execute BEMonsterBubble presentation/record row with Monster_Chapter8_08 and 8000','add one layer of listener state 60404'],'onLaterHpDecrease':'state 60404 accepts TriggerValue < 0 on BSTHpChanged and command 60402 adds 2 layers of state 60083 temporary Reinforce','clearBoundaries':{'state60089':['BSTBeforeBattleEnd'],'state60083':['BSTBeforeBoutBegin','BSTBeforeBattleEnd']},'properties':{'state60089':{'be_damage_per':'ChangedLayer*(-1)','be_fixed_damage_per1':'ChangedLayer*(-1)','be_passive_damage_per':'ChangedLayer*(-1)'},'state2900':{'damage_plus':'ChangedLayer','tentacle_dmg':'ChangedLayer*0.5'},'state60083':{'be_damage_per':'ChangedLayer*(-1)','be_fixed_damage_per1':'ChangedLayer*(-1)','be_passive_damage_per':'ChangedLayer*(-1)'}}},
        'scope':'Exact normalized selected Skill/Cmd/State rows in both pinned PC catalogs; BaseSortID transport/order metadata excluded. Skill-argument ceiling, add-state/property, HP-event behavior and the cross-build-runtime-matched BEMonsterBubble presentation-record body are established by separate registry evidence. This report does not execute command 60401 through the original full scheduler, clear events or transition-skill scheduling.','limitations':['Per actual negative HP-change event, not every attempted hit','No original full-command scheduler, state-clear event execution, gameplay observation or holdout credit','No cheese, budget-comp or leaderboard claim']}
    output=ROOT/'research/evidence/final-evolution-mechanic.json';output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'status':report['status'],'matches':len(matches),'output':str(output.relative_to(ROOT))},indent=2))

if __name__=='__main__':main()
