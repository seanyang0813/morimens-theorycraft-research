// Ordinary subtype only. Ownership, type matches and properties are explicit inputs.
const tagProperties={Card_Defend:'ulti_per_defendcard',Ulti_Skill:'ulti_per_ultiskill',Card_Skill:'ulti_per_skillcard',Card_Strike:'ulti_per_strikecard'};
export function calculateUltiEnergy({base,dimension,properties,card,casterEligible,skillTags}){
  if(!Number.isFinite(base)||!Number.isFinite(dimension)||!properties||typeof casterEligible!=='boolean'||!Array.isArray(skillTags)||skillTags.some(t=>typeof t!=='string')||(card!==null&&(!card||Object.keys(card).length!==1||typeof card.matchesEnergyCardTypes!=='boolean')))throw new Error('Explicit energy inputs, card context, caster eligibility and tags required');
  const propertyReads=[];
  const read=key=>{if(!Object.hasOwn(properties,key)||!Number.isFinite(properties[key]))throw new Error(`Explicit ultimate-energy property required: ${key}`);propertyReads.push(key);return properties[key];};
  let cardPer=0,cardPlus=0,outPer=0,per=0,inside=0,efficiency=0,plus=0,tagFactor=1;
  const tagFactors=[];
  if(card!==null){cardPer=read('card_ulti_per');cardPlus=read('card_ulti_plus');if(casterEligible&&card.matchesEnergyCardTypes)outPer=read('o_ulti_energy_per');}
  if(casterEligible){
    per=read('ulti_energy_per');inside=read('i_ulti_energy_per');efficiency=read('ulti_energy_efficiency');
    for(const tag of skillTags){
      if(!Object.hasOwn(tagProperties,tag))throw new Error(`Unresolved skill-tag energy mapping: ${tag}`);
      const percent=read(tagProperties[tag]);tagFactor*=1+percent/100;tagFactors.push({tag,property:tagProperties[tag],percent});
    }
    plus=read('ulti_energy_plus');
  }
  const scaled=(base+plus+cardPlus+0)*10000*(1+per/100)*(1+inside/100)*(1+outPer/100)*(1+efficiency/100)*(1+cardPer/100)*(1+dimension/100)*tagFactor/10000;
  const showValue=Math.max(Math.ceil(scaled-1e-5),1);
  const targetPer=read('gain_ulti_energy_per'),targetPlus=read('gain_ulti_energy_plus');
  const targetValue=showValue*(1+targetPer/100)+targetPlus,value=Math.ceil(targetValue)||0;
  if(!Number.isFinite(value))throw new Error('Nonfinite ultimate-energy calculation');
  return {value,propertyReads,trace:{scaled,roundingEpsilon:1e-5,showValue,targetValue,tagFactor,tagFactors},
    scope:'Ordinary subtype; explicit card/type/caster/tag context, properties and dimension',
    unresolvedDependencies:['Automatic card/caster eligibility, skill tags and property derivation','Gain effect repetition, Awaker cap/storage and event callbacks','Independent gameplay validation']};
}
export function calculateNoCardUltiEnergy(input){return calculateUltiEnergy({...input,card:null,casterEligible:true,skillTags:[]});}
