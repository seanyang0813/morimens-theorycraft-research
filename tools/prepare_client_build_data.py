"""Minimal numeric character data for the explicit PC build resolver; no copied Lua."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
audit=json.loads((ROOT/'research/evidence/catalog-primary-stat-audit.json').read_text(encoding='utf-8'))
configs=json.loads((ROOT/'research/extracted/config/AwakerConfig.json').read_text(encoding='utf-8'))
rows=[];unresolved=[]
for row in audit['characters']:
    if row['matchCount']!=1 or len(row.get('attributeTalents',[]))!=1:
        unresolved.append({'characterId':row['catalogId'],'reason':'Client identity or attribute talent is not uniquely resolved'});continue
    c=configs[str(row['clientId'])];talent=row['attributeTalents'][0]
    rows.append({'characterId':row['catalogId'],'clientId':row['clientId'],'qualityLevelOffset':row['qualityLevelOffset'],
        'primary':{stat:{'base':c[key],'extra':c[key+'_extra']} for stat,key in [('ATK','atk'),('DEF','def'),('CON','physique')]},
        'gnostic':{'clientTalentId':talent['clientTalentId'],'bonusLevelsByRank':{'0':0,**talent['bonusLevelsByRank']}}})
out={'schemaVersion':1,'build':audit['build'],'sourceHashes':audit['sourceHashes'],'characters':rows,'unresolved':unresolved,
    'scope':'Primary base stats and explicit Gnostic ranks only. No Soulforge, equipment, substats, final battle properties or gameplay validation.'}
(ROOT/'research/evidence/client-build-data.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print('Prepared',len(rows),'client character mappings;',len(unresolved),'unresolved')
