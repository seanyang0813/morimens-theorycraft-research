import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,posix} from 'node:path';
const root=new URL('../',import.meta.url);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function verifiedManifest(){
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
  return manifest;
}
export function verifyRuntimeManifest(){return verifiedManifest().fingerprint;}

const relativeImports=source=>[...source.matchAll(/(?:import|export)\s+(?:[^'\"]*?\s+from\s+)?['\"](\.\.?\/[^'\"]+)['\"]/g)].map(match=>match[1]);
function dependencyClosure(entries,manifest){
  const pending=[...entries],seen=new Set();
  while(pending.length){
    const name=pending.pop();
    if(seen.has(name))continue;
    if(!name.startsWith('engine/')||!Object.hasOwn(manifest.files,name))throw new Error('Runtime contract module is not packaged: '+name);
    seen.add(name);
    const source=readFileSync(new URL(name,root),'utf8');
    for(const specifier of relativeImports(source)){
      let resolved=posix.normalize(posix.join(dirname(name),specifier));
      if(!posix.extname(resolved))resolved+='.mjs';
      pending.push(resolved);
    }
  }
  return [...seen].sort();
}
function observationEntries(scenario){
  if(scenario?.mode==='experimental')return ['engine/observation-scenario.mjs','engine/calculate-damage.mjs'];
  if(scenario?.kind==='morimens-battle-property-snapshot-damage')return ['engine/observation-scenario.mjs','engine/battle-property-snapshot-damage.mjs'];
  if(scenario?.kind==='morimens-card-action-timeline')return ['engine/observation-scenario.mjs','engine/card-action-timeline.mjs'];
  if(scenario?.kind==='morimens-ordered-state-command')return ['engine/observation-scenario.mjs','engine/ordered-state-command.mjs'];
  if(scenario?.schemaVersion===1&&Array.isArray(scenario.steps)&&scenario.target&&['assumed-absent','old-embers-only-assumed'].includes(scenario.interveningEffects))return ['engine/observation-scenario.mjs','engine/research-timeline.mjs'];
  throw new Error('Unsupported observation scenario shape');
}
export function createObservationRuntimeContract(scenario){
  const manifest=verifiedManifest(),entries=observationEntries(scenario).sort();
  // observation-scenario imports every supported adapter. Walk each selected adapter
  // independently and retain the dispatcher itself without following its broad imports.
  const selected=new Set(['engine/observation-scenario.mjs']);
  for(const entry of entries.filter(name=>name!=='engine/observation-scenario.mjs'))for(const name of dependencyClosure([entry],manifest))selected.add(name);
  const files=Object.fromEntries([...selected].sort().map(name=>[name,manifest.files[name]]));
  const contract={schemaVersion:1,algorithm:'sha256',fullRuntimeFingerprint:manifest.fingerprint,entryModules:entries,files};
  return {...contract,fingerprint:hash(JSON.stringify(contract))};
}
export function verifyObservationRuntimeContract(scenario,contract){
  const current=createObservationRuntimeContract(scenario);
  if(!contract||contract.schemaVersion!==1||contract.algorithm!=='sha256')throw new Error('Unsupported observation runtime contract');
  const supplied={schemaVersion:contract.schemaVersion,algorithm:contract.algorithm,fullRuntimeFingerprint:contract.fullRuntimeFingerprint,entryModules:contract.entryModules,files:contract.files};
  if(hash(JSON.stringify(supplied))!==contract.fingerprint)throw new Error('Observation runtime contract fingerprint mismatch');
  if(JSON.stringify(contract.entryModules)!==JSON.stringify(current.entryModules)||JSON.stringify(Object.keys(contract.files??{}))!==JSON.stringify(Object.keys(current.files)))throw new Error('Observation runtime contract scope mismatch');
  for(const [name,digest] of Object.entries(contract.files))if(current.files[name]!==digest)throw new Error('Observation runtime dependency changed: '+name);
  return {frozenRuntimeFingerprint:contract.fullRuntimeFingerprint,currentRuntimeFingerprint:verifyRuntimeManifest(),runtimeContractFingerprint:contract.fingerprint};
}
