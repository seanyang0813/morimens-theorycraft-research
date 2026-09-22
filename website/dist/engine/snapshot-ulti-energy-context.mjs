const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const tagProperties={Card_Defend:'ulti_per_defendcard',Ulti_Skill:'ulti_per_ultiskill',Card_Skill:'ulti_per_skillcard',Card_Strike:'ulti_per_strikecard'};

// Assemble the ordinary self-target Awakener energy context from the same
// complete property snapshots used by a prepared command.
export function deriveSnapshotUltiEnergyTarget({source,skillTags,casterProperties,cardProperties,playerProperties}){
  if(!exact(source,['castRoleUid','cmdServerUid'])||!Number.isSafeInteger(source.castRoleUid)||!Number.isSafeInteger(source.cmdServerUid)||!Array.isArray(skillTags)||skillTags.some(tag=>typeof tag!=='string'))throw new Error('Explicit energy source identity and skill tags required');
  for(const [name,value] of Object.entries({casterProperties,cardProperties,playerProperties}))if(!value||typeof value!=='object'||Array.isArray(value)||Object.values(value).some(item=>!Number.isFinite(item)))throw new Error(`Complete finite ${name} required`);
  const reads=[];
  const read=(owner,property)=>{const values=owner==='caster'?casterProperties:owner==='card'?cardProperties:playerProperties,present=Object.hasOwn(values,property),value=present?values[property]:0;reads.push({owner,property,present,value});return value;};
  const properties={
    card_ulti_per:read('card','card_ulti_per'),card_ulti_plus:read('card','card_ulti_plus'),o_ulti_energy_per:read('caster','o_ulti_energy_per'),
    ulti_energy_per:read('caster','ulti_energy_per'),i_ulti_energy_per:read('caster','i_ulti_energy_per'),ulti_energy_efficiency:read('caster','ulti_energy_efficiency'),ulti_energy_plus:read('caster','ulti_energy_plus'),
    gain_ulti_energy_per:read('caster','gain_ulti_energy_per'),gain_ulti_energy_plus:read('caster','gain_ulti_energy_plus'),
  };
  for(const tag of skillTags){const property=tagProperties[tag];if(!property)throw new Error(`Unresolved skill-tag energy mapping: ${tag}`);properties[property]=read('caster',property);}
  const maximumProperties={ulti_energy_max:read('caster','ulti_energy_max'),ulti_energy_cost_per:read('caster','ulti_energy_cost_per'),ulti_energy_cost_flat:read('caster','ulti_energy_cost_flat'),ulti_energy_max_per:read('caster','ulti_energy_max_per')};
  const target={uid:source.castRoleUid,role:'Awaker',energy:read('caster','ulti_energy'),maximumProperties,calculation:{dimension:read('player','dimension_fix_per'),properties}};
  return {source:'complete property snapshots with GetProperty zero-default',reads,target};
}
