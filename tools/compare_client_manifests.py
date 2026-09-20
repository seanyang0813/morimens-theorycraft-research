"""Compare local content manifests without inferring combat equivalence from bundle hashes."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT=Path(__file__).resolve().parents[1]
paths={
    'pcBundled':ROOT/'research/raw/pc/bundled/_version.json',
    'pcDownloaded':ROOT/'research/raw/pc/downloaded/_version.json',
    'androidBundled':ROOT/'research/raw/android/unpacked/assets/_version.json',
}
manifests={name:json.loads(path.read_text(encoding='utf-8')) for name,path in paths.items()}
def flatten(manifest):
    result={}
    for group in manifest['groups']:
        for item in group['items']:
            name=item['f']
            if name in result and result[name]!=item:
                raise ValueError('Conflicting manifest entries: '+name)
            result[name]=item
    return result
indexes={name:flatten(data) for name,data in manifests.items()}
apk=ROOT/'research/raw/android/morimens-2-5-1.apk'
with zipfile.ZipFile(apk) as archive:
    packaged=archive.namelist()
    rows=[]
    for name in ['config.ab','share.ab','gamescript.ab','foundation.ab','gamelauncher.ab']:
        matches=[entry for entry in packaged if entry.rsplit('/',1)[-1]==name]
        versions={label:index.get(name) for label,index in indexes.items()}
        rows.append({'bundle':name,'manifests':versions,'androidApkEntries':matches,
                     'pcDownloadedAndAndroidManifestHashEqual':versions['pcDownloaded']['h']==versions['androidBundled']['h'],
                     'interpretation':'Bundle metadata only; different bundle hashes do not establish different combat formulas.'})
    android_archive=archive.read('assets/luascript_update.archive')
pc_archive=ROOT/'research/raw/pc/bundled/luascript_update.archive'
archive_comparison={'androidSha256':hashlib.sha256(android_archive).hexdigest(),
                    'pcSha256':hashlib.sha256(pc_archive.read_bytes()).hexdigest() if pc_archive.exists() else None}
archive_comparison['equal']=archive_comparison['androidSha256']==archive_comparison['pcSha256']
out={'kind':'LOCAL_MANIFEST_COMPARISON','sources':{label:{'path':str(path.relative_to(ROOT)),
       'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'versionInfo':manifests[label]['versionInfo']} for label,path in paths.items()},
     'bundles':rows,'startupArchive':archive_comparison,
     'combatEquivalence':'NOT_ESTABLISHED',
     'missingEvidence':'Android downloaded combat/config bundles are not present in the APK entries inspected. No Android formula execution or module comparison is claimed.'}
target=ROOT/'research/evidence/client-manifest-comparison.json'
target.write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'bundlesCompared':len(rows),'androidPackagedMatches':sum(len(r['androidApkEntries']) for r in rows),
                  'matchingManifestHashes':sum(r['pcDownloadedAndAndroidManifestHashEqual'] for r in rows),
                  'startupArchive':archive_comparison,'combatEquivalence':out['combatEquivalence']},indent=2))
