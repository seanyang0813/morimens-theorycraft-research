from pathlib import Path
import json, hashlib, re
import UnityPy
from loguru import logger
logger.remove()
from androguard.core.axml import AXMLPrinter
ROOT=Path(__file__).resolve().parents[1]
raw=ROOT/'research/raw'
if (raw/'bundle-key.bin').exists():UnityPy.set_assetbundle_decrypt_key((raw/'bundle-key.bin').read_bytes())
manifest=AXMLPrinter((raw/'android/unpacked/AndroidManifest.xml').read_bytes()).get_xml_obj()
p=ROOT/'research/builds/android.json'; data=json.loads(p.read_text(encoding='utf-8'))
data['package_metadata']=dict(manifest.attrib)
p.write_text(json.dumps(data,indent=2),encoding='utf-8')
print('Android metadata:',data['package_metadata'])
index=[]
for p in raw.rglob('*.ab'):
    rel=p.relative_to(raw)
    try:
        env=UnityPy.load(str(p))
        counts={}
        for obj in env.objects:
            typ=obj.type.name; counts[typ]=counts.get(typ,0)+1
            if typ!='TextAsset':continue
            d=obj.read(); b=d.m_Script.encode('utf-8','surrogateescape') if isinstance(d.m_Script,str) else bytes(d.m_Script)
            name=re.sub(r'[^a-zA-Z0-9_.-]','_',d.m_Name)
            out=ROOT/'research/extracted'/rel.parent/rel.stem/(str(obj.path_id)+'_'+name)
            out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(b)
            index.append({'bundle':str(rel),'path_id':obj.path_id,'name':d.m_Name,'size':len(b),'sha256':hashlib.sha256(b).hexdigest(),'output':str(out.relative_to(ROOT)),'header':b[:16].hex()})
        print(str(rel),counts)
    except Exception as e:print(str(rel),type(e).__name__,str(e)[:200])
out=ROOT/'research/symbols/text-assets.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(index,indent=2),encoding='utf-8')
print('Extracted',len(index),'text assets')
