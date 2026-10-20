import {calculateDamage} from './calculate-damage.mjs';
const clone=value=>JSON.parse(JSON.stringify(value));
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const allowedRoots=new Set(['offense','target','tentacle','effect','passive']);
function numericPath(scenario,path,value){
  if(typeof path!=='string'||! /^[a-zA-Z][a-zA-Z0-9_]*\.[a-zA-Z][a-zA-Z0-9_]*$/.test(path))throw new Error('Axis must name an existing numeric scenario field');
  const [root,key]=path.split('.');
  if(!allowedRoots.has(root)||['constructor','prototype','__proto__'].includes(key)||!Object.hasOwn(scenario[root]??{},key)||!Number.isFinite(scenario[root][key])||typeof scenario[root][key]!=='number')throw new Error(`Unsupported numeric axis: ${path}`);
  scenario[root][key]=value;
}
function differences(a,b,prefix=''){
  const result=[];
  for(const key of new Set([...Object.keys(a??{}),...Object.keys(b??{})])){
    const path=prefix?`${prefix}.${key}`:key,x=a?.[key],y=b?.[key];
    if(x&&y&&typeof x==='object'&&typeof y==='object'&&!Array.isArray(x)&&!Array.isArray(y))result.push(...differences(x,y,path));
    else if(JSON.stringify(x)!==JSON.stringify(y))result.push({path,baseline:x??null,candidate:y??null});
  }
  return result;
}
function branches(scenario,probability){
  const canCrit=['ACTIVE','TENTACLE'].includes(scenario.damageType);
  if(!canCrit&&probability!==null)throw new Error('Critical probability is inapplicable to this damage category');
  const run=isCrit=>{
    const input=clone(scenario);
    if(canCrit){const key=input.damageType==='ACTIVE'?'target':'tentacle';if(!input[key])throw new Error('Critical path requires explicit category inputs');input[key].isCrit=isCrit;}
    const result=calculateDamage(input),model=result.experimentalModels.find(row=>Number.isFinite(row.preHitDamage));
    if(!model)throw new Error('Scenario has no supported experimental pre-hit result');
    return {preHitDamage:model.preHitDamage,trace:model.trace??result.trace,unresolvedDependencies:result.unresolvedDependencies};
  };
  const ordinary=run(false),critical=canCrit?run(true):null;
  return {noncritical:ordinary.preHitDamage,critical:critical?.preHitDamage??null,
    expected:canCrit?(probability===null?null:ordinary.preHitDamage*(1-probability)+critical.preHitDamage*probability):ordinary.preHitDamage,
    traces:{noncritical:ordinary.trace,critical:critical?.trace??null},unresolvedDependencies:ordinary.unresolvedDependencies};
}

export function runDamageWorksheet(input){
  if(!exact(input,['schemaVersion','kind','setups','rowAxis','columnAxis','threshold'])||input.schemaVersion!==1||input.kind!=='morimens-damage-worksheet')throw new Error('Exact damage worksheet input required');
  if(!Array.isArray(input.setups)||!input.setups.length||input.setups.length>8)throw new Error('Supply 1–8 explicit ability/setup rows');
  for(const axis of [input.rowAxis,input.columnAxis]){
    if(!exact(axis,['label','path','scale','values'])||typeof axis.label!=='string'||!axis.label||!Number.isFinite(axis.scale)||!Array.isArray(axis.values)||!axis.values.length||axis.values.some(value=>!Number.isFinite(value)||!Number.isFinite(value*axis.scale))||new Set(axis.values).size!==axis.values.length)throw new Error('Explicit unique finite axis values and a resolved scale required');
  }
  if(input.rowAxis.path===input.columnAxis.path)throw new Error('Two different axes required');
  const cells=input.setups.length*input.rowAxis.values.length*input.columnAxis.values.length;
  if(cells>500)throw new Error('Worksheet exceeds 500 evaluated cells');
  if(input.threshold!==null&&(!exact(input.threshold,['metric','value'])||!['noncritical','critical','expected'].includes(input.threshold.metric)||!Number.isFinite(input.threshold.value)||input.threshold.value<=0))throw new Error('Threshold requires a named damage metric and positive value');
  const ids=new Set(),first=input.setups[0].scenario;
  const setups=input.setups.map(setup=>{
    if(!exact(setup,['id','label','source','cost','criticalProbability','scenario'])||typeof setup.id!=='string'||!setup.id||ids.has(setup.id)||typeof setup.label!=='string'||typeof setup.source!=='string'||!setup.source||typeof setup.cost!=='string')throw new Error('Each setup needs unique ID, label, source, cost and explicit scenario');
    ids.add(setup.id);
    if(setup.criticalProbability!==null&&(!Number.isFinite(setup.criticalProbability)||setup.criticalProbability<0||setup.criticalProbability>1))throw new Error('Critical probability must be explicit 0–1 or null');
    if(!setup.scenario||setup.scenario.mode!=='experimental'||setup.scenario.hitResolution!==undefined||setup.scenario.build!==first?.build||setup.scenario.damageType!==first?.damageType)throw new Error('Worksheet setups must share explicit build/category and stop before HP resolution');
    const grid=[];
    for(const rowValue of input.rowAxis.values)for(const columnValue of input.columnAxis.values){
      const scenario=clone(setup.scenario);numericPath(scenario,input.rowAxis.path,rowValue*input.rowAxis.scale);numericPath(scenario,input.columnAxis.path,columnValue*input.columnAxis.scale);
      const result=branches(scenario,setup.criticalProbability),metric=input.threshold?.metric;
      grid.push({rowValue,columnValue,...result,passes:metric?(result[metric]===null?null:result[metric]>=input.threshold.value):null});
    }
    return {id:setup.id,label:setup.label,source:setup.source,cost:setup.cost,criticalProbability:setup.criticalProbability,differencesFromBaseline:differences(first,setup.scenario).filter(row=>![input.rowAxis.path,input.columnAxis.path].includes(row.path)),grid};
  });
  return {kind:'morimens-damage-worksheet-result',status:'EXPERIMENTAL_PREHIT_WORKSHEET',build:first.build,damageType:first.damageType,evaluatedCells:cells,rowAxis:clone(input.rowAxis),columnAxis:clone(input.columnAxis),threshold:clone(input.threshold),setups,finalDamage:null,gameplayClear:null,
    limitations:['Inputs are resolved scenarios; character level, STR stacks, incoming-damage storage, Realm Mastery and upgrade labels are not converted to missing skill coefficients.',
      'Cost is a descriptive source field; this worksheet does not pay costs, sequence skills, draw cards or generate resources.',
      'Expected damage uses a supplied single-hit critical probability; it does not reconstruct eligibility, RNG, multi-hit correlation or lethal probability.',
      'Comparisons report changed scenario fields. Equal resource/stat budgets and equal temporal states must be established separately.',
      'Every cell is pre-hit damage before shield/HP, callbacks, enemy response and independent gameplay verification.']};
}
