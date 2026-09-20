import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function verifyRuntimeManifest(){
  const manifest=JSON.parse(readFileSync(new URL('website/dist/runtime-manifest.json',root),'utf8'));
  const modules=JSON.parse(readFileSync(new URL('website/engine-modules.json',root),'utf8'));
  const expected=[...modules.map(n=>'engine/'+n),'build-catalog.json','client-build-data.json','scenario.json','rules.json'].sort();
  if(manifest.schemaVersion!==1||manifest.algorithm!=='sha256'||JSON.stringify(Object.keys(manifest.files).sort())!==JSON.stringify(expected))throw new Error('Runtime manifest file set mismatch; prepare the website again');
  const files={};
  for(const name of expected){
    const packaged=readFileSync(new URL('website/dist/'+name,root));files[name]=hash(packaged);
    if(files[name]!==manifest.files[name])throw new Error('Runtime asset changed: '+name);
    if(name.startsWith('engine/')&&hash(readFileSync(new URL(name,root)))!==files[name])throw new Error('Authored engine differs from prepared runtime: '+name);
  }
  if(hash(JSON.stringify(files))!==manifest.fingerprint)throw new Error('Runtime manifest fingerprint mismatch');
  return manifest.fingerprint;
}
