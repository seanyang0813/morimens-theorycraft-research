"""Cross-source numeric audit; parses a restricted original-config formula, not Lua execution."""
from pathlib import Path
import hashlib
import json
import math
import re
ROOT=Path(__file__).resolve().parents[1]
paths={name:ROOT/path for name,path in {
    'catalog':'research/external/skeydb/awakeners.json',
    'characters':'research/extracted/config/AwakerConfig.json',
    'upgrades':'research/extracted/config/AwakerUpgrade.json',
    'constants':'research/extracted/config/Constant.json',
    'talents':'research/extracted/config/AwakerTalent.json',
    'clientReader':'research/extracted/pc/downloaded/gamescript/8160461218729261677_AwakerDataUtils.lua',
}.items()}
data={k:json.loads(p.read_text(encoding='utf-8')) for k,p in paths.items() if k!='clientReader'}
fields={'ATK':('atk','AtkGrowthOfBaseAtk'),'DEF':('def','DefGrowthOfBaseDef'),'CON':('physique','PhysiqueGrowthOfBasePhysique')}
rows=[]
for c in data['catalog']['records']:
    matches=[v for v in data['characters'].values() if v.get('AwakerResNum')==c['ingameId']+'_AF']
    row={'catalogId':c['id'],'name':c['name'],'resourceId':c['ingameId'],'matchCount':len(matches),'comparisons':0,'mismatches':[],'unsupported':[]}
    rows.append(row)
    if len(matches)!=1:continue
    original=matches[0];row['clientId']=original['ID']
    offset=data['constants']['AwakerUpgradeLevel_'+original['Quality']]['Data']['1']
    row['qualityLevelOffset']=offset
    for level in range(1,91):
        upgrade=next((u for u in data['upgrades'].values() if u.get('Level')==level+offset),None)
        if upgrade is None:row['unsupported'].append({'level':level,'reason':'missing upgrade row'});continue
        for stat,(prop,field) in fields.items():
            formula=upgrade[field]
            pattern=rf'math\.ceil\({prop}\*\(1\+\(([0-9.]+)\+talent_attr_lv\*0\.5\)/10\)\+{prop}_extra\)'
            match=re.fullmatch(pattern,formula)
            if not match:row['unsupported'].append({'level':level,'stat':stat,'formula':formula});continue
            for bonus in [0,2,4,6,8,10]:
                raw=original[prop]*(1+(float(match[1])+bonus*0.5)/10)+original[prop+'_extra']
                client_formula=math.ceil(raw)
                catalog=math.ceil((c['primaryScalingBase']+level+bonus)*c['statScaling'][stat]-1e-9)
                row['comparisons']+=1
                if client_formula!=catalog:row['mismatches'].append({'level':level,'stat':stat,'bonusLevels':bonus,'clientFormulaValue':client_formula,'catalogValue':catalog,'clientRaw':raw,'formula':formula})
    row['attributeTalents']=[]
    for tid,talent in data['talents'].items():
        levels={}
        for level,t in talent.get('data_list',{}).items():
            if t.get('AwakerID')!=original['ID']:continue
            for i in [1,2]:
                if t.get('TalentType'+str(i))=='Talent_Attr_Lv':
                    levels[level]=t['TalentEffect'+str(i)]['1'];break
        if levels:row['attributeTalents'].append({'clientTalentId':int(tid),'bonusLevelsByRank':levels})
report={'kind':'CROSS_SOURCE_CONFIG_AUDIT','build':'pc-res144-build51',
    'scope':'Resource-ID matching with explicit _AF asset suffix; restricted parsing of original upgrade formulas evaluated with Python double arithmetic. Not original Lua execution, final battle stats, Soulforge verification or gameplay validation. Boundary differences require original-runtime investigation.',
    'sourceHashes':{k:hashlib.sha256(p.read_bytes()).hexdigest() for k,p in paths.items()},'characters':rows,
    'summary':{'catalogCharacters':len(rows),'uniqueMatches':sum(r['matchCount']==1 for r in rows),'comparisons':sum(r['comparisons'] for r in rows),'mismatches':sum(len(r['mismatches']) for r in rows),'unsupported':sum(len(r['unsupported']) for r in rows)}}
(ROOT/'research/evidence/catalog-primary-stat-audit.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps(report['summary']))
