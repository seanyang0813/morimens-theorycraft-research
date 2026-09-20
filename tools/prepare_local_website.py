"""Copy only authored formula modules and sanitized numerical scenario inputs.

Local preparation only. Does not register, upload or publish the research site.
"""
from pathlib import Path
import json
import shutil
import hashlib
from prepare_rule_catalog import prepare_rule_catalog
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'website/dist'
prepare_rule_catalog()
(DEST/'engine').mkdir(parents=True,exist_ok=True)
shutil.copyfile(ROOT/'research/evidence/client-build-data.json',DEST/'client-build-data.json')
modules=json.loads((ROOT/'website/engine-modules.json').read_text(encoding='utf-8'))
for name in modules:
    shutil.copyfile(ROOT/'engine'/name,DEST/'engine'/name)
report=json.loads((ROOT/'output/pdf/mouchette-equipped-baseline-calculation.json').read_text(encoding='utf-8'))
rounds=[]
for row in report['rounds']:
    new={'round':row['round']}
    for key in ['aHit','blast','pursuit']:
        hit=row[key]
        new[key]=None if hit is None else {k:hit[k] for k in ['utilityInputs','target']}
    rounds.append(new)
(DEST/'scenario.json').write_text(json.dumps({'rounds':rounds},indent=2)+'\n',encoding='utf-8')
files={name:hashlib.sha256((DEST/name).read_bytes()).hexdigest() for name in sorted([*['engine/'+n for n in modules],'build-catalog.json','client-build-data.json','scenario.json','rules.json'])}
fingerprint=hashlib.sha256(json.dumps(files,sort_keys=True,separators=(',',':')).encode()).hexdigest()
(DEST/'runtime-manifest.json').write_text(json.dumps({'schemaVersion':1,'algorithm':'sha256','fingerprint':fingerprint,'files':files},indent=2)+'\n',encoding='utf-8')
print('Prepared local website numerical inputs and',len(modules),'authored engine modules; no deployment')
