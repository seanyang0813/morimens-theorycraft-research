"""Read-only source acquisition; all copies stay in research/raw."""
from pathlib import Path
import hashlib, json, shutil, zipfile, datetime

ROOT = Path(__file__).resolve().parents[1]
PC = Path(r'C:\Program Files (x86)\Steam\steamapps\common\Morimens')
APK = Path(r'C:\Users\Sean\Downloads\morimens-2-5-1.apk')
def save(path, data):
    p = ROOT / path; p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
def digest(p):
    h = hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda:f.read(1024*1024), b''): h.update(b)
    return h.hexdigest()
def copy(p, rel):
    q = ROOT/'research/raw'/rel; q.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(p,q)
    return {'source':str(p),'copy':str(q.relative_to(ROOT)), 'size':q.stat().st_size,'sha256':digest(q),'mtime':p.stat().st_mtime}
now = datetime.datetime.now(datetime.timezone.utc).isoformat()
pc = {'platform':'PC','research_date':now,'steam_app_id':3052450,'steam_build_id':23408611,'files':[], 'versions':{}}
for rel in ['GameAssembly.dll','TuanjiePlayer.dll','Morimens_Data/Plugins/x86_64/xlua.dll','Morimens_Data/il2cpp_data/Metadata/global-metadata.dat']:
    pc['files'].append(copy(PC/rel, Path('pc')/rel))
for label, rel in [('bundled','Morimens_Data/StreamingAssets'),('downloaded','_game_data_/DownLoad')]:
    folder=PC/rel
    for name in ['_version.json','_ab_info.json','luascript_update.archive','config.ab','gamescript.ab','foundation.ab','gamelauncher.ab','share.ab','text_en.ab','sproto.ab']:
        p=folder/name
        if p.exists():pc['files'].append(copy(p,Path('pc')/label/name))
    pc['versions'][label]=json.loads((folder/'_version.json').read_text(encoding='utf-8')).get('versionInfo')
save('research/builds/pc.json',pc)
android={'platform':'Android','research_date':now,'archive':copy(APK,Path('android')/APK.name),'files':[]}
with zipfile.ZipFile(APK) as z:
    save('research/builds/android-entries.json',[{'name':i.filename,'size':i.file_size,'compressed_size':i.compress_size} for i in z.infolist()])
    for i in z.infolist():
        name=i.filename
        if name=='AndroidManifest.xml' or name.endswith(('global-metadata.dat','libil2cpp.so','libxlua.so','_version.json','_ab_info.json','luascript_update.archive','config.ab','gamescript.ab','foundation.ab','gamelauncher.ab','share.ab','text_en.ab')):
            p=ROOT/'research/raw/android/unpacked'/name
            if not p.resolve().is_relative_to((ROOT/'research/raw/android/unpacked').resolve()):raise ValueError(name)
            p.parent.mkdir(parents=True,exist_ok=True); p.write_bytes(z.read(i))
            android['files'].append({'entry':name,'size':i.file_size,'sha256':digest(p)})
            if name.endswith('_version.json'):android['version_info']=json.loads(p.read_text(encoding='utf-8')).get('versionInfo')
save('research/builds/android.json',android)
print(json.dumps({'pc_versions':pc['versions'],'pc_copies':len(pc['files']),'android_files':len(android['files']),'android_version':android.get('version_info')},indent=2))
