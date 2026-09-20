import {selectProgressionVariant} from './skill-variant.mjs';
import {selectConditionalVariant} from './conditional-variant.mjs';
const conditionalFields=new Set(['CmdList','CmdTarget','Desc','BattleDesc','Name']);
const present=value=>value!==undefined&&value!==null&&value!==false;
const scalar=value=>Number.isFinite(value)||typeof value==='string';
function dense(value){
  if(!value||typeof value!=='object')throw new Error('Dense conditional list required');
  const entries=Array.isArray(value)?value:Object.keys(value).sort((a,b)=>Number(a)-Number(b)).map((key,i)=>{
    if(key!==String(i+1))throw new Error('Sparse conditional list is unsupported');return value[key];
  });
  return Array.from({length:entries.length},(_,i)=>{if(!Object.hasOwn(entries,i))throw new Error('Sparse conditional list is unsupported');return entries[i];});
}
export function resolveScalarSkillField({skill,field,isAwaker,breakSkillLevel,potencyLevel,evaluate}){
  if(!skill||Array.isArray(skill)||typeof skill!=='object'||typeof field!=='string'||!field||typeof isAwaker!=='boolean')throw new Error('Explicit skill, field and role type required');
  for(const level of [breakSkillLevel,potencyLevel])if(!Number.isSafeInteger(level)||level<0)throw new Error('Explicit progression levels required');
  const get=key=>Object.hasOwn(skill,key)?skill[key]:undefined;
  const temporary=get('temp'+field),configured=get(field);
  const route=present(temporary)?'temporary-conditional':present(get('IsPVP'))&&conditionalFields.has(field)?'pvp-conditional':'progression';
  const value=route==='temporary-conditional'?temporary:configured;
  if(route!=='progression'){
    if(value===undefined||value===null)return {route,value:null,selection:null};
    if(scalar(value))return {route,value,selection:null};
    const variants=dense(value).map(row=>{const pair=dense(row);if(pair.length!==2)throw new Error('Conditional pair must contain condition and scalar value');return {condition:pair[0],value:pair[1]};});
    const selection=selectConditionalVariant({variants,evaluate});return {route,value:selection.value,selection};
  }
  if(!present(value))return {route,value:null,selection:null};
  if(scalar(value))return {route,value,selection:null};
  const selection=selectProgressionVariant({variants:value,breakSkillLevel:isAwaker?breakSkillLevel:0,potencyLevel:isAwaker?potencyLevel:0});
  return {route,value:selection.value,selection};
}
