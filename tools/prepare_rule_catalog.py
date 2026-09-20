"""Publishable evidence metadata only; no extracted code or private source paths."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
def prepare_rule_catalog():
    registry=json.loads((ROOT/'research/evidence/registry.json').read_text(encoding='utf-8'))
    entries=[]
    for row in registry['entries']:
        entry={key:row[key] for key in ['id','status','claim','scope','limitations','gameplayValidation'] if key in row}
        entry['sources']=[{key:source[key] for key in ['module','member','sha256']} for source in row.get('sources',[])]
        entry['checks']=row.get('tests',[])
        entries.append(entry)
    out={'schemaVersion':1,'build':registry['build'],'scope':'Selected researched rules, not an exhaustive implementation or gameplay coverage list. Runtime checks use explicit synthetic adapters; source-only claims have a different evidence level.','entries':entries}
    (ROOT/'website/dist/rules.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    return len(entries)
if __name__=='__main__':print('Prepared',prepare_rule_catalog(),'sanitized rule entries')
