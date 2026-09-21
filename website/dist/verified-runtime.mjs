// Load the engine from the exact bytes whose hashes were checked, avoiding a
// second fetch or a previously cached module graph after verification.
export async function loadVerifiedRuntime({fetchFile=path=>fetch(path,{cache:'no-store'}),digest=bytes=>crypto.subtle.digest('SHA-256',bytes),makeUrl=source=>URL.createObjectURL(new Blob([source],{type:'text/javascript'})),revokeUrl=url=>URL.revokeObjectURL(url),importModule=url=>import(url)}={}){
  const hash=async bytes=>Array.from(new Uint8Array(await digest(bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  const read=async path=>{const r=await fetchFile(path);if(!r.ok)throw new Error('Unable to load runtime asset: '+path);return new Uint8Array(await r.arrayBuffer());};
  const manifest=JSON.parse(new TextDecoder().decode(await read('runtime-manifest.json')));
  if(manifest.schemaVersion!==1||manifest.algorithm!=='sha256'||!manifest.files||!Object.keys(manifest.files).length)throw new Error('Unsupported runtime manifest');
  const names=Object.keys(manifest.files).sort(),files={},bytes=new Map();
  for(const name of names){
    if(!/^(engine\/[a-z0-9-]+\.mjs|build-catalog\.json|client-build-data(?:-res150)?\.json|scenario\.json|rules\.json)$/.test(name))throw new Error('Unsupported runtime asset path');
    const data=await read(name);files[name]=await hash(data);
    if(files[name]!==manifest.files[name])throw new Error('Runtime asset changed: '+name);
    bytes.set(name,data);
  }
  if(await hash(new TextEncoder().encode(JSON.stringify(files)))!==manifest.fingerprint)throw new Error('Runtime manifest fingerprint mismatch');
  const urls=new Map(),building=new Set();
  function moduleUrl(name){
    if(urls.has(name))return urls.get(name);
    if(building.has(name))throw new Error('Unsupported cyclic runtime import');
    if(!name.startsWith('engine/')||!bytes.has(name))throw new Error('Missing engine dependency: '+name);
    building.add(name);
    let source=new TextDecoder().decode(bytes.get(name));
    // The authored engine uses static relative named imports only.
    if(/\bimport\s*\(/.test(source)||/\bimport\s*['"]/.test(source))throw new Error('Unsupported runtime import form');
    source=source.replace(/\bfrom\s*(['"])([^'"]+)\1/g,(_,quote,path)=>{
      if(!/^\.\/[a-z0-9-]+\.mjs$/.test(path))throw new Error('Unsupported engine import path');
      return 'from '+JSON.stringify(moduleUrl('engine/'+path.slice(2)));
    });
    const url=makeUrl(source);urls.set(name,url);building.delete(name);return url;
  }
  try{
    const timeline=await importModule(moduleUrl('engine/research-timeline.mjs'));
    const comparison=await importModule(moduleUrl('engine/timeline-experiments.mjs'));
    const actions=await importModule(moduleUrl('engine/card-action-timeline.mjs'));
    const orderSearch=await importModule(moduleUrl('engine/card-order-search.mjs'));
    const examples=await importModule(moduleUrl('engine/card-action-example.mjs'));
    const states=await importModule(moduleUrl('engine/state-sequence-experiment.mjs'));
    const stateExample=await importModule(moduleUrl('engine/state-sequence-example.mjs'));
    const mixed=await importModule(moduleUrl('engine/damage-energy-command.mjs'));
    const mixedExample=await importModule(moduleUrl('engine/damage-energy-example.mjs'));
    const terminal=await importModule(moduleUrl('engine/terminal-state-command.mjs'));
    const ordered=await importModule(moduleUrl('engine/ordered-state-command.mjs'));
    const snapshot=await importModule(moduleUrl('engine/battle-property-snapshot-damage.mjs'));
    return {calculateSnapshotActiveDamage:snapshot.calculateSnapshotActiveDamage,runOrderedStateCommand:ordered.runOrderedStateCommand,runTerminalStateCommand:terminal.runTerminalStateCommand,runDamageEnergyCommand:mixed.runDamageEnergyCommand,syntheticDamageEnergyExample:mixedExample.syntheticDamageEnergyExample,runResearchTimeline:timeline.runResearchTimeline,compareTimelines:comparison.compareTimelines,runCardActionTimeline:actions.runCardActionTimeline,searchCardOrders:orderSearch.searchCardOrders,syntheticCardActionExample:examples.syntheticCardActionExample,runStateSequenceExperiment:states.runStateSequenceExperiment,syntheticStateSequenceExample:stateExample.syntheticStateSequenceExample,runtimeFingerprint:manifest.fingerprint};
  }finally{for(const url of urls.values())revokeUrl(url);}
}
