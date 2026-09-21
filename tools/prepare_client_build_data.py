"""Minimal numeric character data for the explicit PC build resolver; no copied Lua."""
from pathlib import Path
import json
import hashlib
ROOT=Path(__file__).resolve().parents[1]
audit=json.loads((ROOT/'research/evidence/catalog-primary-stat-audit.json').read_text(encoding='utf-8'))
configs=json.loads((ROOT/'research/extracted/config/AwakerConfig.json').read_text(encoding='utf-8'))
talents=json.loads((ROOT/'research/extracted/config/AwakerTalent.json').read_text(encoding='utf-8'))
attr_types=json.loads((ROOT/'research/extracted/config/ActorAttrType.json').read_text(encoding='utf-8'))
stat_names={'physique_per':'CON','atk_per':'ATK','def_per':'DEF'}

def promotion_talents(client_id):
    result=[]
    for talent_id,group in talents.items():
        levels=group.get('data_list',{})
        first=levels.get('1')
        if not first or first.get('AwakerID')!=client_id or not first.get('Season'):
            continue
        rows={};supported=True
        for level_text,row in levels.items():
            slot=next((i for i in (1,2) if row.get(f'TalentType{i}')=='Attr_Promote'),None)
            if slot is None:
                continue
            values=row.get(f'TalentEffect{slot}',{})
            ordered=[values[str(i)] for i in range(1,len(values)+1)]
            if len(ordered)%2:
                raise ValueError(f'odd Attr_Promote vector for talent {talent_id} level {level_text}')
            promoted={}
            for i in range(0,len(ordered),2):
                attr=attr_types[str(ordered[i])]
                if attr.get('Name') not in stat_names or not attr.get('Percentage') or not isinstance(ordered[i+1],(int,float)):
                    supported=False;break
                promoted[stat_names[attr['Name']]]=ordered[i+1]
            if not supported or set(promoted)!={'CON','ATK','DEF'}:
                supported=False;break
            rows[level_text]=promoted
        if supported and rows:
            result.append({'clientTalentId':int(talent_id),'season':first.get('Season'),'maximumLevel':max(map(int,rows)),'percentByLevel':{'0':{'CON':0,'ATK':0,'DEF':0},**rows}})
    return sorted(result,key=lambda row:row['clientTalentId'])

rows=[];unresolved=[]
for row in audit['characters']:
    if row['matchCount']!=1 or len(row.get('attributeTalents',[]))!=1:
        unresolved.append({'characterId':row['catalogId'],'reason':'Client identity or attribute talent is not uniquely resolved'});continue
    c=configs[str(row['clientId'])];talent=row['attributeTalents'][0]
    rows.append({'characterId':row['catalogId'],'clientId':row['clientId'],'qualityLevelOffset':row['qualityLevelOffset'],
        'primary':{stat:{'base':c[key],'extra':c[key+'_extra']} for stat,key in [('ATK','atk'),('DEF','def'),('CON','physique')]},
        'gnostic':{'clientTalentId':talent['clientTalentId'],'bonusLevelsByRank':{'0':0,**talent['bonusLevelsByRank']}},
        'advancementTalents':promotion_talents(row['clientId'])})
source_hashes={**audit['sourceHashes'],'actorAttrTypes':hashlib.sha256((ROOT/'research/extracted/config/ActorAttrType.json').read_bytes()).hexdigest()}
out={'schemaVersion':1,'build':audit['build'],'sourceHashes':source_hashes,'characters':rows,'unresolved':unresolved,
    'scope':'Primary base stats, explicit Gnostic ranks and Attr_Promote percentages from explicit advancement-talent levels. State/passive effects, equipment, substats, final battle properties and gameplay validation are excluded.'}
(ROOT/'research/evidence/client-build-data.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print('Prepared',len(rows),'client character mappings;',len(unresolved),'unresolved')
