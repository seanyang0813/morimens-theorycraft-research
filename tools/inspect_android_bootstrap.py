"""Read-only APK bootstrap inspection; records decoder failure without modifying PC indexes."""
from pathlib import Path
import contextlib
import hashlib
import io
import json
import re
import zipfile
from collections import Counter
import UnityPy
import lz4.block
from UnityPy.streams import EndianBinaryReader
from UnityPy.helpers.ArchiveStorageManager import ArchiveStorageDecryptor
ROOT=Path(__file__).resolve().parents[1]
apk=ROOT/'research/raw/android/morimens-2-5-1.apk'
entry='assets/artres/gameupdate.ab'
with zipfile.ZipFile(apk) as archive:
    data=archive.read(entry)
    startup=archive.read('assets/luascript_update.archive')
report={'kind':'LOCAL_ANDROID_BOOTSTRAP_INSPECTION','apkSha256':hashlib.sha256(apk.read_bytes()).hexdigest(),
    'entry':entry,'entrySize':len(data),'entrySha256':hashlib.sha256(data).hexdigest(),
    'startupSha256':hashlib.sha256(startup).hexdigest(),'startupHeader':startup[:16].hex(),
    'startupPlaintextHttpUrlCount':len(re.findall(rb'https?://[a-zA-Z0-9./_:-]+',startup)),
    'scope':'Static APK entry inspection only. No client execution, network request or formula equivalence claim.'}
key=ROOT/'research/raw/bundle-key.bin'
if key.exists():UnityPy.set_assetbundle_decrypt_key(key.read_bytes())
try:
    with contextlib.redirect_stdout(io.StringIO()),contextlib.redirect_stderr(io.StringIO()):
        env=UnityPy.load(data)
        report['objects']=[{'type':obj.type.name,'pathId':obj.path_id} for obj in env.objects]
    report['decodeStatus']='PARSED_CONTAINER'
except Exception as error:
    report['decodeStatus']='FAILED'
    report['decoderError']={'type':type(error).__name__,'message':str(error)}
try:
    reader=EndianBinaryReader(data)
    signature=reader.read_string_to_null();version=reader.read_u_int();player=reader.read_string_to_null();engine=reader.read_string_to_null()
    size=reader.read_long();compressed=reader.read_u_int();uncompressed=reader.read_u_int();flags=reader.read_u_int()
    if signature!='UnityFS' or version!=6 or flags!=0x643 or size!=len(data):raise ValueError('Unsupported bootstrap header; alignment workaround not applied')
    ArchiveStorageDecryptor(reader) # validates the existing key's signature
    original_offset=reader.Position;aligned_offset=(original_offset+15)//16*16
    metadata=lz4.block.decompress(data[aligned_offset:aligned_offset+compressed],uncompressed_size=uncompressed)
    if len(metadata)!=uncompressed:raise ValueError('Unexpected metadata length')
    # Version 7 selects UnityPy's 16-byte header alignment. Only memory is changed.
    patched=data[:8]+(7).to_bytes(4,'big')+data[12:]
    env=UnityPy.load(patched);counts=Counter(obj.type.name for obj in env.objects)
    field_scan={'readableMonoBehaviours':0,'failedMonoBehaviours':0,'stringFields':0,'nonemptyStringFields':0,'literalHttpUrls':0,'nonemptyEndpointNamedFields':0}
    def scan(value,path=''):
        if isinstance(value,dict):
            for name,child in value.items():scan(child,path+'/'+str(name))
        elif isinstance(value,list):
            for index,child in enumerate(value):scan(child,path+'/'+str(index))
        elif isinstance(value,str):
            field_scan['stringFields']+=1;field_scan['nonemptyStringFields']+=bool(value)
            field_scan['literalHttpUrls']+=bool(re.match(r'^https?://',value,re.I))
            field_scan['nonemptyEndpointNamedFields']+=bool(value) and any(name in path.lower() for name in ('url','host','server','cdn','download'))
    for obj in (obj for obj in env.objects if obj.type.name=='MonoBehaviour'):
        try:scan(obj.read_typetree());field_scan['readableMonoBehaviours']+=1
        except Exception:field_scan['failedMonoBehaviours']+=1
    report['compatibilityDecode']={'status':'PARSED_CONTAINER','originalVersion':version,'engineVersion':engine,'flags':hex(flags),'keySignatureValid':True,'originalMetadataOffset':original_offset,'alignedMetadataOffset':aligned_offset,'metadataLength':len(metadata),'metadataSha256':hashlib.sha256(metadata).hexdigest(),'inMemoryHeaderOverride':{'offset':8,'originalHex':data[8:12].hex(),'replacementHex':patched[8:12].hex()},'objectCounts':dict(counts),'textAssetCount':counts['TextAsset'],'scope':'Compatibility alignment override validated by decompression and container parsing; original APK unchanged. No combat script or cross-platform rule equivalence recovered.'}
    report['compatibilityDecode']['serializedFieldScan']=field_scan
except Exception as error:
    report['compatibilityDecode']={'status':'FAILED','type':type(error).__name__,'message':str(error)}
report['nextEvidenceNeeded']='Fingerprinted downloaded Android combat/config bundles. The packaged update bundle contains no TextAssets in the successful compatibility parse; do not infer CDN paths from PC content.'
(ROOT/'research/evidence/android-bootstrap-inspection.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({**{k:report[k] for k in ['entry','entrySize','decodeStatus','startupPlaintextHttpUrlCount']},'compatibilityDecode':report['compatibilityDecode']}))
