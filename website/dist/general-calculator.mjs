import {inputKeys,neutralShowInputs} from './engine/show-damage.mjs';
import {targetKeys} from './engine/active-target.mjs';
import {calculateDamage,build} from './engine/calculate-damage.mjs';
const labels={value:'Resolved base damage',strength:'STR flat damage contribution',playerInsideDamagePer:'Team Damage Amplification (%)',awakerCritDamage:'Character Crit DMG bonus (%)',vulnerablePer:'Vulnerability (%)',beDamagePlus:'Target flat damage taken',enemyStateDmgMultiplier:'Enemy state multiplier (×)',baseDamage:'Resolved effect base damage',dimensionFixPer:'Dimension modifier (%)'};
export const fieldsFor=type=>{
  if(type==='ACTIVE')return [
    ...inputKeys.map(key=>({key:'offense.'+key,label:labels[key]??key,defaultValue:key==='value'?null:neutralShowInputs(0)[key],group:['value','strength','playerInsideDamagePer'].includes(key)?'Base & amplification':'Advanced offense'})),
    ...targetKeys.filter(k=>k!=='isCrit').map(key=>({key:'target.'+key,label:labels[key]??key,defaultValue:key==='enemyStateDmgMultiplier'?1:0,group:['awakerCritDamage','vulnerablePer'].includes(key)?'Critical & target':'Advanced target'}))];
  if(!['PASSIVE','FIXED','PURE'].includes(type))throw new Error('Unsupported damage category');
  return ['baseDamage',...(type==='PURE'?[]:['dimensionFixPer',...Array.from({length:type==='PASSIVE'?3:5},(_,i)=>type.toLowerCase()+(i+1))])].map(key=>({key,label:labels[key]??`${type==='PASSIVE'?'Passive':'Fixed'} target multiplier ${key.replace(/\D/g,'')} (%)`,defaultValue:key==='baseDamage'?null:0,group:'Effect damage'}));
};
export const hitFields=[['hp','Target current HP',null],['block','Shield',0],['retainHp','Active-prevention retained HP',0],['limit','Incoming damage cap (0 = none)',0],['usedLimit','Damage already counted toward cap',0],['deathResist','Death resistance property',0]];
const validNumber=v=>(typeof v==='number'||typeof v==='string'&&v.trim()!=='')&&Number.isFinite(Number(v));
export function buildGeneralScenario({damageType,values,isCrit,hitEnabled,hitValues,immune,puncture,preventEligible}){
  const scenario={build,mode:'experimental',damageType};
  const fields=fieldsFor(damageType),allowed=fields.map(f=>f.key);
  if(!values||Object.keys(values).some(k=>!allowed.includes(k)))throw new Error('Unknown calculation field');
  const read=key=>{if(!Object.hasOwn(values,key)||!validNumber(values[key]))throw new Error('Enter a finite value for '+key);return Number(values[key]);};
  if(damageType==='ACTIVE'){
    if(typeof isCrit!=='boolean')throw new Error('Choose whether this hit is critical');
    scenario.offense={};scenario.target={isCrit};
    for(const f of fields){const [group,key]=f.key.split('.');scenario[group][key]=read(f.key);}
  }else{
    const effect=Object.fromEntries(fields.map(f=>[f.key,read(f.key)]));
    Object.assign(effect,{build,targetDead:false});
    if(damageType==='PASSIVE')scenario.passive=effect;
    else scenario.effect={...effect,category:damageType};
  }
  if(typeof hitEnabled!=='boolean')throw new Error('Explicit hit-resolution choice required');
  if(hitEnabled){
    if([immune,puncture,preventEligible].some(v=>typeof v!=='boolean'))throw new Error('Explicit hit flags required');
    const h={immune,puncture,preventEligible};
    for(const [key] of hitFields){const v=hitValues?.[key];if(!validNumber(v))throw new Error('Enter a finite value for '+key);h[key]=Number(v);}
    scenario.hitResolution=h;
  }
  return scenario;
}
export function calculateGeneral(input){return {...calculateDamage(buildGeneralScenario(input)),analysisTrack:'theorycrafting',claimBoundary:{purpose:'Evaluate supplied damage inputs and A/B hypotheses',mustNotClaim:['observed cheese','leaderboard prevalence','independent gameplay verification']}};}
