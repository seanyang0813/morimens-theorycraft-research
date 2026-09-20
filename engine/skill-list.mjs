import {selectProgressionVariant} from './skill-variant.mjs';
const scalar=value=>Number.isFinite(value)||typeof value==='string';
function list(value){
  if(!value||typeof value!=='object')throw new Error('Explicit scalar list required');
  if(Array.isArray(value)){
    if(!Array.from({length:value.length},(_,i)=>i).every(i=>Object.hasOwn(value,i)&&scalar(value[i])))throw new Error('Dense scalar list required');
    return [...value];
  }
  return Object.keys(value).sort((a,b)=>Number(a)-Number(b)).map((key,i)=>{
    if(key!==String(i+1)||!scalar(value[key]))throw new Error('Dense numeric-key scalar list required');return value[key];
  });
}
export function selectProgressionList({value,breakSkillLevel,potencyLevel}){
  for(const level of [breakSkillLevel,potencyLevel])if(!Number.isSafeInteger(level)||level<0)throw new Error('Explicit progression levels required');
  if(value===null)return {value:null,selection:null};
  if(!value||typeof value!=='object')throw new Error('List or progression-list map required');
  const entries=Object.values(value);
  if(entries.every(scalar))return {value:list(value),selection:null};
  if(Array.isArray(value)||entries.some(scalar)||entries.some(item=>!item||typeof item!=='object'))throw new Error('Mixed or ambiguous list variants are unsupported');
  const lists=Object.fromEntries(Object.entries(value).map(([key,item])=>[key,list(item)]));
  const selection=selectProgressionVariant({variants:Object.fromEntries(Object.keys(lists).map(key=>[key,0])),breakSkillLevel,potencyLevel});
  return {value:selection.found?[...lists[selection.matchKey]]:null,selection:{matchKey:selection.matchKey,status:selection.status,breakThreshold:selection.breakThreshold,potencyThreshold:selection.potencyThreshold}};
}
