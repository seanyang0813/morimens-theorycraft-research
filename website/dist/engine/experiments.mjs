import {calculateDamage,build} from './calculate-damage.mjs';
const supportedCategories={
  [build]:['ACTIVE','PASSIVE','FIXED','PURE'],
  'pc-res150-build51':['FIXED','PURE'],
  'pc-res151-build51':['FIXED','PURE','TENTACLE'],
};

export function snapshot(value){
  const visit=v=>{
    if(v===null||typeof v==='string'||typeof v==='boolean')return;
    if(typeof v==='number'&&Number.isFinite(v))return;
    if(Array.isArray(v)){for(let i=0;i<v.length;i++){if(!Object.hasOwn(v,i))throw new Error('Sparse experiment arrays are not supported');visit(v[i]);}return;}
    if(v&&Object.getPrototypeOf(v)===Object.prototype){for(const item of Object.values(v))visit(item);return;}
    throw new Error('Experiment inputs must be finite JSON values');
  };
  visit(value);return JSON.parse(JSON.stringify(value));
}
export function changes(a,b,path=''){
  if(Object.is(a,b))return [];
  if(a&&b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)){
    return [...new Set([...Object.keys(a),...Object.keys(b)])].sort().flatMap(key=>{
      const p=path+'/'+key.replaceAll('~','~0').replaceAll('/','~1');
      if(!Object.hasOwn(a,key))return [{path:p,kind:'added',after:b[key]}];
      if(!Object.hasOwn(b,key))return [{path:p,kind:'removed',before:a[key]}];
      return changes(a[key],b[key],p);
    });
  }
  return [{path,kind:'changed',before:a,after:b}];
}
function metrics(result){
  const pre=result.experimentalModels.find(m=>Object.hasOwn(m,'preHitDamage'));
  const hp=result.experimentalModels.find(m=>m.name==='Ordinary HP subtraction');
  return {preHitDamage:pre?.preHitDamage??null,modeledHpLost:hp?.modeledHpLost??null,hpAfter:hp?.hpAfter??null,shieldAfter:hp?.shieldAfter??null};
}
export function compareScenarios(experiment,{runtimeFingerprint=null}={}){
  const frozen=snapshot(experiment);
  if(!frozen||frozen.schemaVersion!==1||Object.keys(frozen).some(k=>!['schemaVersion','analysisTrack','baseline','candidate','runtimeFingerprint'].includes(k)))throw new Error('Expected experiment schemaVersion 1 with baseline and candidate');
  if(Object.hasOwn(frozen,'analysisTrack')&&frozen.analysisTrack!=='theorycrafting')throw new Error('Formula experiments belong to the theorycrafting analysis track');
  frozen.analysisTrack='theorycrafting';
  const validHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
  if(runtimeFingerprint!==null&&!validHash(runtimeFingerprint))throw new Error('Invalid runtime fingerprint');
  if(Object.hasOwn(frozen,'runtimeFingerprint')){
    if(!validHash(frozen.runtimeFingerprint))throw new Error('Invalid saved runtime fingerprint');
    if(frozen.runtimeFingerprint!==runtimeFingerprint)throw new Error('Runtime fingerprint mismatch or current runtime not verified; replay refused');
  }
  if(runtimeFingerprint!==null)frozen.runtimeFingerprint=runtimeFingerprint;
  for(const key of ['baseline','candidate']){
    const scenario=frozen[key];
    if(scenario?.mode!=='experimental'||!supportedCategories[scenario.build]?.includes(scenario.damageType))
      throw new Error('Both scenarios must explicitly use a supported build, damage category and experimental mode');
  }
  if(frozen.baseline.build!==frozen.candidate.build)throw new Error('A/B comparison requires the same client build');
  const baseline=calculateDamage(frozen.baseline),candidate=calculateDamage(frozen.candidate);
  const a=metrics(baseline),b=metrics(candidate);
  const deltas=Object.fromEntries(Object.keys(a).map(k=>[k,a[k]===null||b[k]===null?null:b[k]-a[k]]));
  const at=baseline.experimentalModels[0]?.trace??[],bt=candidate.experimentalModels[0]?.trace??[];
  const traceComparable=frozen.baseline.damageType===frozen.candidate.damageType&&at.length===bt.length&&at.every((s,i)=>s.stage===bt[i].stage);
  const stageChanges=traceComparable?at.map((s,i)=>({stage:s.stage,baseline:s.value,candidate:bt[i].value,delta:bt[i].value-s.value})):[];
  return {schemaVersion:1,analysisTrack:'theorycrafting',status:'EXPERIMENTAL',finalDamage:null,experiment:frozen,reproducibility:runtimeFingerprint===null?'UNPINNED':'RUNTIME_PINNED',
    inputChanges:changes(frozen.baseline,frozen.candidate),metrics:{baseline:a,candidate:b,delta:deltas},traceComparable,stageChanges,
    interpretation:'Deltas compare the supplied scenarios. They do not attribute an individual causal contribution when several inputs change. Missing metrics remain null, not zero.',
    unresolvedDependencies:[...new Set([...baseline.unresolvedDependencies,...candidate.unresolvedDependencies])],baseline,candidate};
}
