"""Export pinned SKeyDB selection metadata; no inferred combat effects or copied lore."""
from pathlib import Path
import hashlib
import json
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'research/external/skeydb'
revision='a2ff07765b2e0c78af827577f881054dbe224d8d'
out={'schemaVersion':1,'source':{'name':'SKeyDB','revision':revision,'url':'https://github.com/dansa/SKeyDB/tree/'+revision,'license':'CC BY-NC-SA 4.0','files':{}},'characters':[],'wheels':[]}
for filename,collection,keys in [('awakeners.json','characters',['id','name','realm','rarity','type','primaryScalingBase','statScaling']),('wheels.json','wheels',['id','name','realm','rarity','mainstatKey','ownerAwakenerId','ownerAwakenerName','searchTags'])]:
    path=source/filename
    out['source']['files'][filename]={'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    rows=json.loads(path.read_text(encoding='utf-8'))['records']
    out[collection]=sorted([{key:row[key] for key in keys if key in row} for row in rows],key=lambda r:r['name'].casefold())
    if len({r['id'] for r in out[collection]})!=len(rows):raise ValueError('Duplicate catalog identity')
for filename in ['awakener-level-scaling.ts','wheel-mainstat-scaling.ts','wheel-enhance.ts','gameplay-math.json']:
    out['source']['files'][filename]={'sha256':hashlib.sha256((source/filename).read_bytes()).hexdigest()}
out['wheelMainstatScaling']=json.loads((source/'gameplay-math.json').read_text(encoding='utf-8'))['wheelMainstatScaling']
out['scope']='Selection identities, normalized Wheel discovery tags and primary-stat growth coefficients. No passive description or lore is included. Inclusion does not establish combat implementation, equipment legality, optimality or current live-game availability.'
(ROOT/'website/dist/build-catalog.json').write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print('Prepared',len(out['characters']),'character and',len(out['wheels']),'Wheel identities')
