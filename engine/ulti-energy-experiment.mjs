import {snapshot} from './experiments.mjs';
import {calculateUltiEnergy} from './ulti-energy-calculation.mjs';
import {runUltiEnergyEffect} from './ulti-energy-effect.mjs';
import {gainUltiEnergy} from './ulti-energy-gain.mjs';
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
export function runUltiEnergyExperiment(value){
 const input=snapshot(value);
 if(!exact(input,['schemaVersion','kind','build','otherEvents','parameters','source','targetOrder','targets'])||input.schemaVersion!==1||input.kind!=='morimens-ulti-energy-experiment'||input.build!=='pc-res144-build51'||input.otherEvents!=='assumed-absent'||!Array.isArray(input.targets)||!Array.isArray(input.targetOrder))throw new Error('Explicit ultimate-energy experiment required');
 const registry=new Map(),calculations=new Map();
 for(const t of input.targets){
  if(!exact(t,['uid','role','energy','maximumProperties','calculation'])||!Number.isSafeInteger(t.uid)||registry.has(t.uid)||t.role!=='Awaker'||!exact(t.calculation,['dimension','properties','card','casterEligible','skillTags']))throw new Error('Unique explicit Awaker target snapshots required');
  calculateUltiEnergy({...t.calculation,base:0});
  gainUltiEnergy({energy:t.energy,request:0,maximumProperties:t.maximumProperties,ignoreMax:false});
  registry.set(t.uid,t);
 }
 if(input.targetOrder.some(uid=>!registry.has(uid)))throw new Error('Unresolved target identity');
 const report=runUltiEnergyEffect({parameters:input.parameters,targets:input.targetOrder,source:input.source,
  calculate:(base,uid)=>{const calculation=calculateUltiEnergy({...registry.get(uid).calculation,base});calculations.set(uid,calculation);return calculation.value;},
  gain:(uid,request,source)=>{
   const target=registry.get(uid),before=target.energy;
   const storage=gainUltiEnergy({energy:before,request,maximumProperties:target.maximumProperties,ignoreMax:false,castValue:source.castValue});
   target.energy=storage.energyAfter;
   return {energyBefore:before,calculation:calculations.get(uid),storage};
  }});
 return {schemaVersion:1,build:input.build,status:'EXPERIMENTAL',finalDamage:null,
  targetsAfter:[...registry.values()].map(t=>({uid:t.uid,energy:t.energy})),effect:report,
  unresolvedDependencies:[...report.unresolvedDependencies,'Connected original energy-path checks cover one self-target Awaker with observed callbacks; no full command or gameplay validation','Explicit static properties, card/type/tag decisions and Awaker targets; no automatic build or target assembly','No callbacks dispatched, no VFX, no other state/resource effects; within one effect only']};
}
