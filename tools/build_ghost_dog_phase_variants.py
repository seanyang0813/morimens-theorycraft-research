"""Separate the configured Ghost-faced Dog rebirth path from phase-cap states."""
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
    base={name:json.loads((BASE/f'{name}.json').read_text(encoding='utf-8')) for name in ('MonsterConfig','Cmd','State','Skill')}
    current={name:json.loads((CURRENT/f'{name}.json').read_text(encoding='utf-8')) for name in ('Cmd','State','Skill')}
    selected={'Cmd':['60563'],'State':['60564','44806'],'Skill':['60397','60398']};rows={};matches=[]
    for name,ids in selected.items():
        rows[name]={}
        for identity in ids:
            baseline=clean(base[name][identity]);installed=clean(current[name][identity])
            if baseline!=installed:raise ValueError(f'Current {name} {identity} differs from baseline beyond BaseSortID')
            rows[name][identity]=baseline;matches.append(f'{name}:{identity}')
    monster=clean(base['MonsterConfig']['60097']);rows['MonsterConfig']={'60097':monster}
    phase_refs={sid:[] for sid in ('60409','60408')}
    for identity,row in base['MonsterConfig'].items():
        states=(row.get('ExistState') or {}).values() if isinstance(row.get('ExistState'),dict) else []
        for sid in phase_refs:
            if int(sid) in states:phase_refs[sid].append(identity)
    report={'schemaVersion':1,'kind':'MORIMENS_HIGH_DIFFICULTY_MECHANIC_TRACE','analysisTrack':'mechanics','baselineBuild':'pc-res144-build51','currentBuild':'pc-res150-build51','status':'EXACT_SELECTED_CATALOG_MATCH','mechanic':'Ghost-faced dog phase-path separation','sourceHashes':{'baseline':{name:sha(BASE/f'{name}.json') for name in base},'currentPrivateExports':{name:sha(CURRENT/f'{name}.json') for name in current}},'normalizedMatches':matches,'rows':rows,'monsterConfigPhaseStateReferences':phase_refs,
      'derived':{
        'configuredPath':'MonsterConfig 60097 starts with state 60564; that state triggers command 60563 on BSTRoleBeforeDeath.',
        'firstPreDeath':'With marker 44806 at 0, command 60563 selects skill 60397. Its missing second BEMonsterChangeSkill parameter defaults to Substitute, not Insert. The ordered rows remove 60564, add one marker layer, conditionally restore 60564, request PvE rebirth, heal max HP and add state 46441.',
        'secondPreDeath':'With marker 44806 at 1, command 60563 selects skill 60398 through Substitute. After the marker increases, the restore condition is no longer satisfied, so the catalog sequence does not reinstall 60564.',
        'separateThresholdMechanic':'States 60409 and 60408 encode the separately tested 66%/33% phase-cap path, but neither appears in any baseline MonsterConfig ExistState list. No exported MonsterConfig link ties that threshold path to monster 60097.'},
      'scope':'Complete baseline MonsterConfig ExistState scan plus exact selected Cmd/State/Skill row comparison across the two pinned PC catalogs. Default Substitute behavior is established by separate BEMonsterChangeSkill runtime evidence. Ordered first/second path descriptions combine row order with separately tested live state mutation; command 60563 is not executed as one integrated chain.','limitations':['Current resource-150 MonsterConfig was not recovered in this export set','No proof of external stage injection for states 60409/60408','No BEPVERebirth body, full death lifecycle, gameplay observation or holdout credit','No cheese, budget-comp, theorycraft-result or leaderboard claim']}
    output=ROOT/'research/evidence/ghost-dog-phase-variants.json';output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'status':report['status'],'matches':len(matches),'output':str(output.relative_to(ROOT))},indent=2))

if __name__=='__main__':main()
